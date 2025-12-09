import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Link as LinkIcon, Calendar, Grid, Image, Heart, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Post } from '../lib/supabase';

const TABS = [
  { id: 'posts', label: 'Posts', icon: Grid },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'likes', label: 'Likes', icon: Heart },
];

export default function Profile() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Fetch User's Posts
  useEffect(() => {
    if (!user) return;
    
    async function fetchUserPosts() {
      setLoadingPosts(true);
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (data) setUserPosts(data);
      setLoadingPosts(false);
    }

    fetchUserPosts();
  }, [user]);

  if (!profile) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="pb-24"
    >
      {/* Banner */}
      <div className="h-48 md:h-64 bg-[rgb(var(--color-surface))] relative overflow-hidden">
        {profile.banner_url ? (
           <img src={profile.banner_url} className="w-full h-full object-cover" alt="Banner" />
        ) : (
           <div className="w-full h-full bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))] opacity-30" />
        )}
      </div>

      <div className="px-5 relative">
        {/* Avatar & Action Button */}
        <div className="flex justify-between items-end -mt-16 mb-4">
           <motion.div 
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             transition={{ type: "spring", bounce: 0.4, delay: 0.2 }}
             className="w-32 h-32 rounded-full border-4 border-[rgb(var(--color-background))] bg-[rgb(var(--color-surface))] overflow-hidden shadow-lg"
           >
             <img 
               src={profile.avatar_url || `https://i.pravatar.cc/300?u=${profile.username}`} 
               alt="Profile" 
               className="w-full h-full object-cover" 
             />
           </motion.div>
           
           <motion.button 
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className="mb-2 px-6 py-2.5 rounded-full bg-[rgb(var(--color-surface))] border border-[rgba(var(--color-border),0.5)] text-[rgb(var(--color-text))] font-bold text-sm shadow-sm flex items-center gap-2"
           >
             <Settings size={16} /> Edit Profile
           </motion.button>
        </div>

        {/* Info */}
        <div className="space-y-3 mb-8">
          <div>
            <div className="flex items-center gap-2">
               <h1 className="text-2xl font-black">{profile.display_name}</h1>
               {profile.verified && <span className="text-blue-400">✓</span>}
            </div>
            <p className="text-[rgb(var(--color-text-secondary))]">@{profile.username}</p>
          </div>
          
          <p className="text-[rgb(var(--color-text))] max-w-lg leading-relaxed whitespace-pre-wrap">
            {profile.bio || "No bio yet."}
          </p>

          <div className="flex flex-wrap gap-4 text-sm text-[rgb(var(--color-text-secondary))]">
            {/* Hardcoded location for now as it's not in schema yet */}
            <div className="flex items-center gap-1"><MapPin size={16} /> Earth</div>
            {profile.bio_link && (
               <div className="flex items-center gap-1"><LinkIcon size={16} /> <a href={profile.bio_link} target="_blank" className="text-[rgb(var(--color-primary))] hover:underline truncate max-w-[200px]">{profile.bio_link}</a></div>
            )}
            <div className="flex items-center gap-1"><Calendar size={16} /> Joined {new Date(profile.created_at).toLocaleDateString()}</div>
          </div>

          <div className="flex gap-4 pt-2">
            <div><span className="font-bold text-[rgb(var(--color-text))]">0</span> <span className="text-[rgb(var(--color-text-secondary))]">Following</span></div>
            <div><span className="font-bold text-[rgb(var(--color-text))]">0</span> <span className="text-[rgb(var(--color-text-secondary))]">Followers</span></div>
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
                    {activeTab === 'posts' && userPosts.map((post) => (
                       <div key={post.id} className="aspect-square bg-[rgb(var(--color-surface))] overflow-hidden cursor-pointer border border-[rgba(var(--color-border),0.2)]">
                           {post.media_url ? (
                             <img src={post.media_url} alt="post" className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full p-2 text-[10px] flex items-center justify-center text-center text-[rgb(var(--color-text-secondary))]">
                                {post.content.slice(0, 50)}...
                             </div>
                           )}
                       </div>
                    ))}
                    {activeTab === 'posts' && userPosts.length === 0 && (
                        <div className="col-span-3 text-center py-10 text-[rgb(var(--color-text-secondary))]">No posts yet.</div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}