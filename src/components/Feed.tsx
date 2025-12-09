import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon, Send, X, Loader2 } from 'lucide-react';
import { supabase, Post, uploadMedia, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// --- Framer Motion Variants ---
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

// --- Component Props/Types ---
// Define a Post with its associated Profile data for the UI
type PostWithProfile = Post & {
  profiles: Profile;
};

// --- Main Feed Component ---
export default function Feed() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  
  // Header scroll effects
  const { scrollY } = useScroll();
  const headerY = useTransform(scrollY, [0, 50], [0, -50]);
  const headerOpacity = useTransform(scrollY, [0, 50], [1, 0]);

  // ------------------------------------------------------------------
  // 1. DATA FETCHING AND REALTIME
  // ------------------------------------------------------------------

  const fetchPosts = async () => {
    setIsLoadingFeed(true);
    
    // Fetch posts and join the related profile data
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (id, username, display_name, avatar_url, verified)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
        console.error('Error fetching posts:', error);
    } else if (data) {
        setPosts(data as PostWithProfile[]);
    }
    setIsLoadingFeed(false);
  };
  
  const handleRealtimeInsert = (payload: RealtimePostgresChangesPayload<Post>) => {
      // Supabase Realtime payload only contains the new row (Post without profile join)
      const newPostId = payload.new.id;

      // We need to fetch the post again with the profile data
      supabase.from('posts').select('*, profiles(id, username, display_name, avatar_url, verified)').eq('id', newPostId).single()
          .then(({ data }) => {
              if (data) {
                // Prepend new post to the feed
                setPosts(prev => [data as PostWithProfile, ...prev]);
              }
          });
  };

  useEffect(() => {
    fetchPosts();

    // Real-time subscription for new posts
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, handleRealtimeInsert)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ------------------------------------------------------------------
  // 2. CREATE POST LOGIC
  // ------------------------------------------------------------------

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPostContent.trim() && !newPostMedia) || !user) return;

    setIsPosting(true);
    let mediaUrl = '';
    let mediaType = '';

    try {
      if (newPostMedia) {
        // Upload media to Supabase Storage
        const uploadResult = await uploadMedia(newPostMedia, 'posts');
        if (uploadResult) {
          mediaUrl = uploadResult.url;
          mediaType = uploadResult.type;
        }
      }

      // Insert new post into the 'posts' table
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newPostContent,
        media_url: mediaUrl || null, // Ensure empty string becomes NULL
        media_type: mediaType || null
      });

      if (error) throw error;
      
      // Reset form on success
      setNewPostContent('');
      setNewPostMedia(null);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to post. Check the console for details.');
    } finally {
      setIsPosting(false);
    }
  };

  // ------------------------------------------------------------------
  // 3. ACTION LOGIC (Like/Repost/Comment)
  // ------------------------------------------------------------------

  const handleLike = async (postId: string) => {
      if (!user) return;
      
      // OPTIMISTICALLY UPDATE UI
      setPosts(prevPosts => 
          prevPosts.map(post => 
              post.id === postId 
              ? { ...post, like_count: post.like_count + 1 } // Simple increment
              : post
          )
      );

      // ASYNCHRONOUSLY UPDATE DATABASE (Example: toggle like status in a `likes` table)
      const { error } = await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
      
      if (error && !error.message.includes('duplicate')) {
          console.error('Error liking post:', error);
          // REVERT UI UPDATE on error
          setPosts(prevPosts => 
              prevPosts.map(post => 
                  post.id === postId 
                  ? { ...post, like_count: post.like_count - 1 }
                  : post
              )
          );
      }
      // Note: A more robust solution would check for existing likes before deciding to insert or delete.
  };


  // ------------------------------------------------------------------
  // 4. RENDERING
  // ------------------------------------------------------------------

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
      {user && (
        <div className="p-4 border-b border-[rgba(var(--color-border),0.3)] bg-[rgba(var(--color-surface),0.3)]">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-[rgb(var(--color-surface))] overflow-hidden flex-shrink-0">
              <img 
                src={profile?.avatar_url || `https://i.pravatar.cc/150?u=${user?.id}`} 
                className="w-full h-full object-cover" 
                alt="Your avatar"
              />
            </div>
            <form onSubmit={handleCreatePost} className="flex-1">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's happening?"
                className="w-full bg-transparent border-none focus:ring-0 text-[rgb(var(--color-text))] text-lg resize-none placeholder-[rgb(var(--color-text-secondary))]"
                rows={2}
                disabled={isPosting}
              />
              {newPostMedia && (
                <div className="relative mb-2 w-fit">
                  <img src={URL.createObjectURL(newPostMedia)} alt="Media Preview" className="h-32 rounded-lg border border-[rgba(var(--color-border),0.5)] object-cover" />
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
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,video/*,audio/*" 
                    onChange={(e) => e.target.files && setNewPostMedia(e.target.files[0])} 
                    disabled={isPosting}
                  />
                </label>
                <button 
                  type="submit" 
                  disabled={isPosting || (!newPostContent.trim() && !newPostMedia)}
                  className="px-4 py-1.5 rounded-full bg-[rgb(var(--color-primary))] text-[rgb(var(--color-text-on-primary))] font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 
                  {isPosting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoadingFeed && (
          <div className="flex justify-center p-8">
              <Loader2 size={24} className="animate-spin text-[rgb(var(--color-primary))]" />
          </div>
      )}

      {/* Feed List */}
      {!isLoadingFeed && (
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
                    src={post.profiles.avatar_url || `https://i.pravatar.cc/150?u=${post.user_id}`} 
                    className="w-10 h-10 rounded-full bg-gray-700 object-cover" 
                    alt="avatar" 
                  />
                  <div>
                    <h3 className="font-bold text-sm leading-tight flex items-center gap-1">
                      {post.profiles.display_name || post.profiles.username || 'User'}
                      {post.profiles.verified && <span className="text-blue-400" title="Verified Account">✓</span>}
                    </h3>
                    <p className="text-xs text-[rgb(var(--color-text-secondary))]">
                      @{post.profiles.username} • {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button className="p-2 rounded-full hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-secondary))]">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              <p className="text-[rgb(var(--color-text))] mb-4 leading-relaxed whitespace-pre-wrap font-normal">
                {post.content}
              </p>

              {post.media_url && post.media_type && (
                <PostMediaRenderer post={post} />
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[rgba(var(--color-border),0.3)]">
                 <ActionButton 
                    icon={Heart} 
                    count={post.like_count || 0} 
                    activeColor="text-pink-500" 
                    onClick={() => handleLike(post.id)} 
                    // isLiked={... check if user liked the post}
                 />
                 <ActionButton icon={MessageCircle} count={post.comment_count || 0} activeColor="text-blue-500" />
                 <ActionButton icon={Share2} count={post.repost_count || 0} activeColor="text-green-500" />
              </div>
            </motion.article>
          ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}

// --- Sub-Components ---

const PostMediaRenderer = ({ post }: { post: Post }) => {
    const isImage = post.media_type === 'image';
    const isVideo = post.media_type === 'video';
    
    return (
        <motion.div 
            whileHover={{ scale: 1.01 }}
            className="rounded-2xl overflow-hidden mb-4 border border-[rgba(var(--color-border),0.2)] max-h-[500px] relative bg-black/5"
        >
            {isImage && (
                <img 
                    src={post.media_url} 
                    alt="Post content" 
                    className="w-full h-full object-contain" 
                    loading="lazy" 
                />
            )}
            {isVideo && (
                <video 
                    controls 
                    src={post.media_url} 
                    className="w-full h-full object-contain"
                >
                    Your browser does not support the video tag.
                </video>
            )}
            {/* Add more types (audio, document) as needed */}
        </motion.div>
    );
};

const ActionButton = ({ icon: Icon, count, activeColor, onClick, isLiked }: any) => (
  <motion.button 
    whileTap={{ scale: 0.8 }}
    onClick={onClick}
    className="flex items-center gap-2 py-2 px-3 rounded-full hover:bg-[rgb(var(--color-surface-hover))] group transition-colors"
  >
    <Icon 
        size={20} 
        className={isLiked ? activeColor : "text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))]"} 
        fill={isLiked ? activeColor.replace('text-', 'fill-') : 'none'} // Use fill for 'liked' state
    />
    {(count > 0 || count === 0) && <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">{count}</span>}
  </motion.button>
);