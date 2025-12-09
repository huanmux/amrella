import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon, Send, X } from 'lucide-react';
import { supabase, Post, uploadMedia } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0, scale: 0.95 },
  visible: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100 } }
};

export default function Feed() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  
  const { scrollY } = useScroll();
  const headerY = useTransform(scrollY, [0, 50], [0, -50]);
  const headerOpacity = useTransform(scrollY, [0, 50], [1, 0]);

  // Fetch Posts
  useEffect(() => {
    fetchPosts();

    // Real-time subscription for new posts
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        // Optimistically fetch the new post with profile data to prepend
        supabase.from('posts').select('*, profiles(*)').eq('id', payload.new.id).single()
          .then(({ data }) => {
            if (data) setPosts(prev => [data, ...prev]);
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (username, display_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setPosts(data);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPostContent.trim() && !newPostMedia) || !user) return;

    setIsPosting(true);
    let mediaUrl = '';
    let mediaType = 'image';

    try {
      if (newPostMedia) {
        const uploadResult = await uploadMedia(newPostMedia, 'posts');
        if (uploadResult) {
          mediaUrl = uploadResult.url;
          mediaType = uploadResult.type;
        }
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newPostContent,
        media_url: mediaUrl,
        media_type: mediaType
      });

      if (error) throw error;
      
      // Reset form
      setNewPostContent('');
      setNewPostMedia(null);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
      // In a real app, you'd toggle an entry in the 'likes' table
      // For visual feedback now, we'll just optimistically update local state
      // (Actual implementation requires checking if user already liked it)
      console.log("Like clicked for", postId);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0, x: -20 }}
      className="relative"
    >
      {/* Header */}
      <motion.header 
        style={{ y: headerY, opacity: headerOpacity }}
        className="sticky top-0 z-40 p-4 backdrop-blur-xl bg-[rgba(var(--color-background),0.8)] border-b border-[rgba(var(--color-border),0.5)]"
      >
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[rgb(var(--color-text))] to-[rgba(var(--color-text),0.7)] bg-clip-text text-transparent">Home</h1>
      </motion.header>

      {/* Create Post Input */}
      <div className="p-4 border-b border-[rgba(var(--color-border),0.3)] bg-[rgba(var(--color-surface),0.3)]">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-[rgb(var(--color-surface))] overflow-hidden flex-shrink-0">
             <img src={profile?.avatar_url || `https://i.pravatar.cc/150?u=${user?.id}`} className="w-full h-full object-cover" />
          </div>
          <form onSubmit={handleCreatePost} className="flex-1">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What's happening?"
              className="w-full bg-transparent border-none focus:ring-0 text-[rgb(var(--color-text))] text-lg resize-none placeholder-[rgb(var(--color-text-secondary))]"
              rows={2}
            />
            {newPostMedia && (
              <div className="relative mb-2 w-fit">
                <img src={URL.createObjectURL(newPostMedia)} alt="Preview" className="h-32 rounded-lg border border-[rgba(var(--color-border),0.5)]" />
                <button 
                  type="button"
                  onClick={() => setNewPostMedia(null)}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white shadow-md hover:scale-110 transition-transform"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="flex justify-between items-center mt-2">
              <label className="cursor-pointer text-[rgb(var(--color-primary))] p-2 hover:bg-[rgba(var(--color-primary),0.1)] rounded-full transition-colors">
                <ImageIcon size={20} />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && setNewPostMedia(e.target.files[0])} />
              </label>
              <button 
                type="submit" 
                disabled={isPosting || (!newPostContent && !newPostMedia)}
                className="px-4 py-1.5 rounded-full bg-[rgb(var(--color-primary))] text-[rgb(var(--color-text-on-primary))] font-bold text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isPosting ? 'Posting...' : <><Send size={14} /> Post</>}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Feed List */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 px-4 py-6 pb-24"
      >
        <AnimatePresence mode='popLayout'>
        {posts.map((post) => (
          <motion.article 
            key={post.id}
            layout
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[rgb(var(--color-surface))] rounded-[28px] p-5 shadow-sm border border-[rgba(var(--color-border),0.4)] hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-3 items-center">
                <img 
                  src={post.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${post.user_id}`} 
                  className="w-10 h-10 rounded-full bg-gray-700 object-cover" 
                  alt="avatar" 
                />
                <div>
                  <h3 className="font-bold text-sm leading-tight">{post.profiles?.display_name || 'User'}</h3>
                  <p className="text-xs text-[rgb(var(--color-text-secondary))]">@{post.profiles?.username} • {new Date(post.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <button className="p-2 rounded-full hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-secondary))]">
                <MoreHorizontal size={20} />
              </button>
            </div>

            <p className="text-[rgb(var(--color-text))] mb-4 leading-relaxed whitespace-pre-wrap font-normal">
              {post.content}
            </p>

            {post.media_url && post.media_type === 'image' && (
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="rounded-2xl overflow-hidden mb-4 border border-[rgba(var(--color-border),0.2)] max-h-[500px] relative bg-black/5"
              >
                <img src={post.media_url} alt="Post content" className="w-full h-full object-contain" loading="lazy" />
              </motion.div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[rgba(var(--color-border),0.3)]">
               <ActionButton icon={Heart} count={post.like_count || 0} activeColor="text-pink-500" onClick={() => handleLike(post.id)} />
               <ActionButton icon={MessageCircle} count={post.comment_count || 0} activeColor="text-blue-500" />
               <ActionButton icon={Share2} count={null} activeColor="text-green-500" />
            </div>
          </motion.article>
        ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

const ActionButton = ({ icon: Icon, count, activeColor, onClick }: any) => (
  <motion.button 
    whileTap={{ scale: 0.8 }}
    onClick={onClick}
    className="flex items-center gap-2 py-2 px-3 rounded-full hover:bg-[rgb(var(--color-surface-hover))] group transition-colors"
  >
    <Icon size={20} className="text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))]" />
    {(count > 0 || count === 0) && <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">{count}</span>}
  </motion.button>
);