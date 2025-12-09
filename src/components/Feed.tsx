import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { supabase, Post } from '../lib/supabase';
import { StatusTray } from './Status';
import { useAuth } from '../contexts/AuthContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0, scale: 0.95 },
  visible: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100 } }
};

// Helper for relative time
const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return Math.floor(seconds) + "s";
};

export default function Feed() {
  const { user } = useAuth();
  const { scrollY } = useScroll();
  const headerY = useTransform(scrollY, [0, 50], [0, -50]);
  const headerOpacity = useTransform(scrollY, [0, 50], [1, 0]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (*)
          `)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setPosts(data || []);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();

    // Real-time subscription for new posts
    const subscription = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = payload.new as Post;
        // We need to fetch the profile for the new post
        supabase.from('profiles').select('*').eq('id', newPost.user_id).single()
          .then(({ data: profile }) => {
            if (profile) {
              setPosts(current => [{ ...newPost, profiles: profile }, ...current]);
            }
          });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleLike = async (postId: string) => {
     if (!user) return;
     // Optimistic UI update could go here, but for now we'll just hit the DB
     // Note: Real implementation needs a check if user already liked from 'likes' table
     await supabase.rpc('toggle_like', { entity_id: postId, entity_type: 'post', user_id: user.id });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0, x: -20 }}
      className="relative"
    >
      {/* Dynamic Header */}
      <motion.header 
        style={{ y: headerY, opacity: headerOpacity }}
        className="sticky top-0 z-40 p-4 backdrop-blur-xl bg-[rgba(var(--color-background),0.8)] border-b border-[rgba(var(--color-border),0.5)]"
      >
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[rgb(var(--color-text))] to-[rgba(var(--color-text),0.7)] bg-clip-text text-transparent">Home</h1>
      </motion.header>

      {/* Real Status Tray */}
      <div className="relative z-0">
        <StatusTray />
      </div>

      {/* Posts Feed */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 px-4 pb-24 mt-4"
      >
        {loading && (
           <div className="flex flex-col gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="bg-[rgb(var(--color-surface))] h-64 rounded-[28px] animate-pulse" />
              ))}
           </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-10 text-[rgb(var(--color-text-secondary))]">
            <p>No posts yet. Be the first to share something!</p>
          </div>
        )}

        {posts.map((post) => (
          <motion.article 
            key={post.id}
            variants={itemVariants}
            className="bg-[rgb(var(--color-surface))] rounded-[28px] p-5 shadow-sm border border-[rgba(var(--color-border),0.4)] hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-3 items-center">
                <img 
                  src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.profiles?.username}`} 
                  className="w-10 h-10 rounded-full bg-gray-200" 
                  alt="avatar" 
                />
                <div>
                  <h3 className="font-bold text-sm leading-tight">
                    {post.profiles?.display_name || 'Unknown User'}
                  </h3>
                  <p className="text-xs text-[rgb(var(--color-text-secondary))]">
                    @{post.profiles?.username} • {timeAgo(post.created_at)}
                  </p>
                </div>
              </div>
              <button className="p-2 rounded-full hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-secondary))]">
                <MoreHorizontal size={20} />
              </button>
            </div>

            <p className="text-[rgb(var(--color-text))] mb-4 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>

            {post.media_url && post.media_type === 'image' && (
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="rounded-2xl overflow-hidden mb-4 border border-[rgba(var(--color-border),0.2)] aspect-video relative bg-gray-900"
              >
                <img src={post.media_url} alt="Post content" className="w-full h-full object-cover" loading="lazy" />
              </motion.div>
            )}

            {post.media_url && post.media_type === 'video' && (
               <motion.div 
               className="rounded-2xl overflow-hidden mb-4 border border-[rgba(var(--color-border),0.2)] relative bg-gray-900"
             >
               <video src={post.media_url} controls className="w-full max-h-[500px]" />
             </motion.div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[rgba(var(--color-border),0.3)]">
               <ActionButton 
                 icon={Heart} 
                 count={post.like_count} 
                 activeColor="text-pink-500" 
                 onClick={() => handleLike(post.id)}
               />
               <ActionButton icon={MessageCircle} count={post.comment_count} activeColor="text-blue-500" />
               <ActionButton icon={Share2} count={post.repost_count || 0} activeColor="text-green-500" />
            </div>
          </motion.article>
        ))}
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
    <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">{count || 0}</span>
  </motion.button>
);