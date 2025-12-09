import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Link as LinkIcon, Calendar, Grid, Image, Heart, BadgeCheck } from 'lucide-react';
import { supabase, Post } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const TABS = [
  { id: 'posts', label: 'Posts', icon: Grid },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'likes', label: 'Likes', icon: Heart },
];

export default function Profile() {
  const { user, profile: authProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  
  // Data State
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [loadingPosts, setLoadingPosts] = useState(false);

  // We use the auth profile for the 'Me' page. 
  // In a real router setup, you'd check if a URL param exists to fetch someone else.
  const profile = authProfile;

  // 1. Fetch Stats
  useEffect(() => {
    if (!profile) return;

    const fetchStats = async () => {
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile.id);

      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profile.id);

      setStats({
        followers: followersCount || 0,
        following: followingCount || 0
      });
    };
    fetchStats();
  }, [profile]);

  // 2. Fetch Tab Content
  useEffect(() => {
    if (!profile) return;
    setLoadingPosts(true);
    setPosts([]);

    const fetchContent = async () => {
      try {
        let query = supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (activeTab === 'posts') {
          // All posts by user
          query = query.eq('user_id', profile.id);
        } else if (activeTab === 'media') {
          // Only posts with media by user
          query = query.eq('user_id', profile.id).neq('media_url', '');
        } else if (activeTab === 'likes') {
           // This is trickier with Supabase simple client filtering (joins).
           // We first get the IDs of posts the user liked.
           const { data: likedRefs } = await supabase
            .from('likes')
            .select('entity_id')
            .eq('user_id', profile.id)
            .eq('entity_type', 'post');
            
           if (likedRefs && likedRefs.length > 0) {
             const ids = likedRefs.map(l => l.entity_id);
             query = supabase.from('posts').select('*').in('id', ids).order('created_at', { ascending: false });
           } else {
             setPosts([]);
             setLoadingPosts(false);
             return;
           }
        }

        const { data, error } = await query;
        if (!error && data) {
          setPosts(data);
        }
      } catch (err) {
        console.error("Error fetching tab content:", err);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchContent();
  }, [profile, activeTab]);


  if (!profile) return <div className="p-10 text-center">Loading Profile...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="pb-24"
    >
      {/* Banner */}
      <div className="h-48 md:h-64 bg-gradient-to-br from-[rgb(var(--color-primary))] to-purple-600 relative overflow-hidden">
        {profile.banner_url ? (
            <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.banner_url})` }}
          />
        ) : (
            <div className="absolute inset-0 bg-black/20" />
        )}
      </div>

      <div className="px-5 relative">
        {/* Avatar */}
        <div className="flex justify-between items-end -mt-16 mb-4">
           <motion.div 
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             transition={{ type: "spring", bounce: 0.4, delay: 0.2 }}
             className="w-32 h-32 rounded-full border-4 border-[rgb(var(--color-background))] bg-[rgb(var(--color-surface))] overflow-hidden shadow-lg"
           >
             <img 
               src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`} 
               alt="Profile" 
               className="w-full h-full object-cover" 
             />
           </motion.div>
           
           <motion.button 
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className="mb-2 px-6 py-2.5 rounded-full bg-[rgb(var(--color-text))] text-[rgb(var(--color-background))] font-bold text-sm shadow-lg"
           >
             Edit Profile
           </motion.button>
        </div>

        {/* Info */}
        <div className="space-y-3 mb-8">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
                {profile.display_name}
                {profile.verified && <BadgeCheck size={20} className="text-[rgb(var(--color-primary))]" />}
            </h1>
            <p className="text-[rgb(var(--color-text-secondary))]">@{profile.username}</p>
          </div>
          
          <p className="text-[rgb(var(--color-text))] max-w-lg leading-relaxed whitespace-pre-wrap">
            {profile.bio || "No bio yet."}
          </p>

          <div className="flex flex-wrap gap-4 text-sm text-[rgb(var(--color-text-secondary))]">
            <div className="flex items-center gap-1"><MapPin size={16} /> Earth</div>
            {profile.bio_link && (
                 <div className="flex items-center gap-1">
                    <LinkIcon size={16} /> 
                    <a href={profile.bio_link} target="_blank" rel="noreferrer" className="text-[rgb(var(--color-primary))] hover:underline">
                        {new URL(profile.bio_link).hostname}
                    </a>
                 </div>
            )}
            <div className="flex items-center gap-1">
                <Calendar size={16} /> Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <div><span className="font-bold text-[rgb(var(--color-text))]">{stats.following}</span> <span className="text-[rgb(var(--color-text-secondary))]">Following</span></div>
            <div><span className="font-bold text-[rgb(var(--color-text))]">{stats.followers}</span> <span className="text-[rgb(var(--color-text-secondary))]">Followers</span></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 bg-[rgb(var(--color-background))] z-10 pt-2">
          <div className="flex border-b border-[rgba(var(--color-border),0.5)]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 relative py-4 flex flex-col items-center justify-center gap-2 group"
              >
                <span className={`text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-[rgb(var(--color-text))]' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute bottom-0 w-16 h-1 rounded-t-full bg-[rgb(var(--color-primary))]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className="absolute inset-0 bg-[rgba(var(--color-text),0.03)] opacity-0 group-hover:opacity-100 transition-opacity rounded-lg m-1" />
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[300px] py-6">
            <AnimatePresence mode='wait'>
                <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-3 gap-1"
                >
                    {loadingPosts && (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="aspect-square bg-[rgb(var(--color-surface))] animate-pulse" />
                        ))
                    )}

                    {!loadingPosts && posts.length === 0 && (
                        <div className="col-span-3 text-center py-10 text-[rgb(var(--color-text-secondary))]">
                            Nothing to see here yet.
                        </div>
                    )}

                    {!loadingPosts && posts.map((post) => (
                        <div key={post.id} className="aspect-square bg-[rgb(var(--color-surface))] relative group overflow-hidden cursor-pointer border border-[rgba(var(--color-border),0.1)]">
                             {post.media_type === 'image' && post.media_url ? (
                                 <img src={post.media_url} alt="post" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                             ) : post.media_type === 'video' && post.media_url ? (
                                 <video src={post.media_url} className="w-full h-full object-cover" />
                             ) : (
                                 <div className="w-full h-full p-4 flex items-center justify-center bg-[rgb(var(--color-surface))]">
                                     <p className="text-xs text-[rgb(var(--color-text))] line-clamp-4 text-center opacity-70">
                                         {post.content}
                                     </p>
                                 </div>
                             )}
                             
                             {/* Hover Overlay */}
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                                <div className="flex items-center gap-1 font-bold">
                                    <Heart size={16} fill="white" /> {post.like_count || 0}
                                </div>
                             </div>
                        </div>
                    ))}
                </motion.div>
            </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}