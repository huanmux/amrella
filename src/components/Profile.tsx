import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Link as LinkIcon, Calendar, Grid, Image, Heart, Settings, Loader2, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Post, Profile as ProfileType } from '../lib/supabase'; // Renamed Profile import to ProfileType for clarity

// --- Types ---
type TabId = 'posts' | 'media' | 'likes';

type FollowStats = {
  followers: number;
  following: number;
};

// Define a Post with its associated Profile data for UI consistency
type PostWithProfile = Post & {
    profiles: ProfileType;
};

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'posts', label: 'Posts', icon: Grid },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'likes', label: 'Likes', icon: Heart },
];

// --- Main Component ---
export default function Profile() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('posts');
  const [userPosts, setUserPosts] = useState<PostWithProfile[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // ------------------------------------------------------------------
  // 1. DATA FETCHING (Posts & Follow Stats)
  // ------------------------------------------------------------------

  // Function to fetch all necessary data
  const fetchData = async () => {
    if (!user) return;
    
    // --- Fetch Posts ---
    setLoadingPosts(true);
    // Fetch user's posts and join the related profile data (needed for reposts if implemented)
    // Note: We include the profile join even though it's the current user, for consistency with the PostCard
    const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
            *,
            profiles (id, username, display_name, avatar_url, verified)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (!postsError && postsData) {
        setUserPosts(postsData as PostWithProfile[]);
    }
    setLoadingPosts(false);

    // --- Fetch Follow Stats (Requires a 'follows' table) ---
    setLoadingStats(true);
    
    // 1. Count Followers (users FOLLOWING the current user)
    const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

    // 2. Count Following (users the current user is FOLLOWING)
    const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

    setFollowStats({ 
        followers: followersCount || 0, 
        following: followingCount || 0 
    });
    setLoadingStats(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);
  
  // ------------------------------------------------------------------
  // 2. Tab Content Filtering
  // ------------------------------------------------------------------
  
  // Filter posts based on the active tab
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'posts':
        // Filter out reposts if you want only original content, or show everything
        // Here, we show all posts (including media posts) in the card view.
        return userPosts;
      case 'media':
        // Only show posts that have a media URL
        return userPosts.filter(post => post.media_url);
      case 'likes':
        // **PLACEHOLDER**: In a real app, this would query a separate `likes` table
        return []; 
      default:
        return [];
    }
  }, [activeTab, userPosts]);

  if (!profile) return <div className="p-4 text-center">Loading profile...</div>;

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  // ------------------------------------------------------------------
  // 3. UI RENDERING
  // ------------------------------------------------------------------

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="pb-24 relative"
    >
      {/* Banner */}
      <div className="h-48 md:h-64 bg-gradient-to-br from-[rgb(var(--color-primary))] to-purple-600 relative overflow-hidden">
        {profile.banner_url && (
            <img 
              src={profile.banner_url} 
              alt="Profile banner" 
              className="w-full h-full object-cover" 
            />
        )}
      </div>

      {/* Profile Header */}
      <div className="p-4 -mt-16 md:-mt-24">
        <div className="flex justify-between items-end">
          <img 
            src={profile.avatar_url || `https://i.pravatar.cc/150?u=${profile.id}`} 
            className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover bg-[rgb(var(--color-background))] border-4 border-[rgb(var(--color-background))]" 
            alt="Avatar" 
          />
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2 rounded-full bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))] font-bold border border-[rgba(var(--color-border),0.5)] hover:bg-[rgb(var(--color-surface-hover))] transition-colors flex items-center gap-2"
          >
            <Settings size={18} />
            Edit Profile
          </motion.button>
        </div>
        
        <div className="mt-4">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            {profile.display_name}
            {profile.verified && <span className="text-blue-400 text-lg" title="Verified Account">✓</span>}
          </h1>
          <p className="text-[rgb(var(--color-text-secondary))] text-sm">@{profile.username}</p>
        </div>

        <p className="mt-3 text-[rgb(var(--color-text))] whitespace-pre-wrap">{profile.bio}</p>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[rgb(var(--color-text-secondary))] text-sm mt-3">
            {profile.bio_link && (
                <div className="flex items-center gap-1">
                    <LinkIcon size={14} />
                    <a href={profile.bio_link} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--color-primary))] hover:underline truncate max-w-[200px]">{profile.bio_link.replace(/https?:\/\//, '')}</a>
                </div>
            )}
            <div className="flex items-center gap-1">
                <Calendar size={14} />
                Joined {joinDate}
            </div>
            {/* You can add location here if your profile has a location field */}
        </div>
        
        {loadingStats ? (
            <div className="flex items-center gap-4 mt-3">
                <Loader2 size={16} className="animate-spin text-[rgb(var(--color-primary))]" />
            </div>
        ) : (
            <div className="flex items-center gap-4 text-[rgb(var(--color-text))] mt-3">
                <span className="text-sm font-bold">{followStats.following}</span>
                <span className="text-sm text-[rgb(var(--color-text-secondary))]">Following</span>
                
                <span className="text-sm font-bold">{followStats.followers}</span>
                <span className="text-sm text-[rgb(var(--color-text-secondary))]">Followers</span>
            </div>
        )}
      </div>
      
      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-[rgba(var(--color-background),0.9)] backdrop-blur-sm border-b border-[rgba(var(--color-border),0.5)]">
        <div className="flex justify-around">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="py-4 px-4 text-center relative group flex-1 transition-colors"
              >
                <div className={`flex items-center justify-center gap-2 text-sm font-bold transition-colors ${isActive ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                  <tab.icon size={18} />
                  {tab.label}
                </div>
                {isActive && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute bottom-0 w-full h-1 bg-[rgb(var(--color-primary))]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className="absolute inset-0 bg-[rgba(var(--color-text),0.03)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="py-6">
        <AnimatePresence mode='wait'>
            {loadingPosts ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center p-8">
                    <Loader2 size={24} className="animate-spin text-[rgb(var(--color-primary))]" />
                </motion.div>
            ) : (
                <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                >
                    {activeTab === 'posts' && <PostsTabContent posts={tabContent} />}
                    {activeTab === 'media' && <MediaTabContent posts={tabContent} />}
                    {activeTab === 'likes' && <LikesTabContent />}
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ==================================================================
// --- SUB-COMPONENTS FOR TAB CONTENT ---
// ==================================================================

/**
 * Renders the Post Card view, matching the style of Feed.tsx.
 */
const PostsTabContent = ({ posts }: { posts: PostWithProfile[] }) => (
    <div className="flex flex-col gap-6 px-4">
        {posts.length === 0 ? (
            <div className="text-center py-10 text-[rgb(var(--color-text-secondary))]">
                No posts found.
            </div>
        ) : (
            <AnimatePresence>
                {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))}
            </AnimatePresence>
        )}
    </div>
);

/**
 * Renders a grid of media (used for the 'media' tab).
 */
const MediaTabContent = ({ posts }: { posts: PostWithProfile[] }) => (
    <div className="grid grid-cols-3 gap-1 px-1">
        {posts.length === 0 ? (
            <div className="col-span-3 text-center py-10 text-[rgb(var(--color-text-secondary))]">
                No media posts found.
            </div>
        ) : (
            <AnimatePresence>
                {posts.map((post) => (
                    <motion.div 
                        key={post.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="aspect-square bg-[rgb(var(--color-surface))] overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    >
                        <PostMediaRenderer post={post} />
                    </motion.div>
                ))}
            </AnimatePresence>
        )}
    </div>
);

/**
 * Placeholder for the Likes Tab
 */
const LikesTabContent = () => (
    <div className="text-center py-10 text-[rgb(var(--color-text-secondary))] px-4">
        Feature not implemented. This view would fetch posts the user has liked from a `likes` table and display them using the PostCard component.
    </div>
);


// ==================================================================
// --- REUSABLE COMPONENTS (Shared with Feed.tsx) ---
// ==================================================================

const formatTimeAgo = (date: string): string => {
  const diff = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return new Date(date).toLocaleDateString();
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'Now';
};

const PostMediaRenderer = ({ post }: { post: Post }) => {
    const isImage = post.media_type === 'image';
    const isVideo = post.media_type === 'video';
    
    // Fallback for MediaGrid: if not an image/video, show text snippet
    if (!isImage && !isVideo) {
        return (
             <div className="w-full h-full p-4 text-xs flex items-center justify-center text-center text-[rgb(var(--color-text-secondary))] bg-[rgb(var(--color-surface-hover))]">
               Text post: {post.content.slice(0, 50)}...
             </div>
        )
    }

    return (
        <motion.div 
            whileHover={{ scale: 1.01 }}
            className="rounded-xl overflow-hidden mb-4 border border-[rgba(var(--color-border),0.2)] max-h-[500px] relative bg-black/5"
        >
            {isImage && (
                <img 
                    src={post.media_url} 
                    alt="Post content" 
                    className="w-full h-full object-cover" 
                    loading="lazy" 
                />
            )}
            {isVideo && (
                <video 
                    controls 
                    src={post.media_url} 
                    className="w-full h-full object-cover"
                >
                    Your browser does not support the video tag.
                </video>
            )}
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
        fill={isLiked ? activeColor.replace('text-', 'fill-') : 'none'}
    />
    {(count > 0 || count === 0) && <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">{count}</span>}
  </motion.button>
);


const PostCard = ({ post }: { post: PostWithProfile }) => {
    const handleLike = () => {
        // Placeholder for like functionality
        console.log(`Liking post ${post.id}`);
    };

    return (
        <motion.article 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.005, backgroundColor: 'rgba(var(--color-surface-hover), 1)' }}
            className="bg-[rgb(var(--color-surface))] rounded-[28px] p-5 shadow-sm border border-[rgba(var(--color-border),0.4)] transition-all"
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
                            @{post.profiles.username} • {formatTimeAgo(post.created_at)}
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
                    onClick={handleLike} 
                />
                <ActionButton icon={MessageCircle} count={post.comment_count || 0} activeColor="text-blue-500" />
                <ActionButton icon={Share2} count={post.repost_count || 0} activeColor="text-green-500" />
            </div>
        </motion.article>
    );
};