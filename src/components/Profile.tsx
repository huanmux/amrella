import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Link as LinkIcon, Calendar, Grid, Image, Heart, Settings, Loader2, MessageCircle, Share2, MoreHorizontal, X, Upload
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
// Assuming your supabase.ts exports these types and the client
import { supabase, Post, Profile as ProfileType } from '../lib/supabase'; 

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

// --- Utility Functions (for PostCard/Profile Details) ---

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


// --- Modal Component Placeholder (For Edit Profile) ---

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentProfile: ProfileType;
    updateProfile: (updates: Partial<ProfileType>) => Promise<void>;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, currentProfile, updateProfile }) => {
    const [displayName, setDisplayName] = useState(currentProfile.display_name);
    const [bio, setBio] = useState(currentProfile.bio);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setDisplayName(currentProfile.display_name);
            setBio(currentProfile.bio);
        }
    }, [isOpen, currentProfile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // This logic is a required placeholder for the 'Edit Profile' button to be 'working'
            await updateProfile({ display_name: displayName, bio: bio });
            onClose();
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[rgb(var(--color-surface))] rounded-xl w-full max-w-md shadow-2xl"
            >
                <div className="flex justify-between items-center p-4 border-b border-[rgba(var(--color-border),0.5)]">
                    <h2 className="text-xl font-bold">Edit Profile</h2>
                    <motion.button whileHover={{ scale: 1.1 }} onClick={onClose} className="p-2 rounded-full hover:bg-[rgb(var(--color-surface-hover))]">
                        <X size={24} />
                    </motion.button>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4 flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden relative">
                             <img src={currentProfile.avatar_url || `https://i.pravatar.cc/150?u=${currentProfile.id}`} alt="Avatar" className="w-full h-full object-cover" />
                             <motion.div whileHover={{ opacity: 1 }} className="absolute inset-0 bg-black/30 opacity-0 transition-opacity flex items-center justify-center cursor-pointer">
                                <Upload size={24} className="text-white" />
                             </motion.div>
                        </div>
                        <label className="text-sm font-medium text-[rgb(var(--color-primary))] hover:underline cursor-pointer">
                            Change Banner
                            <input type="file" className="hidden" accept="image/*" />
                        </label>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full p-2 bg-[rgb(var(--color-background))] border border-[rgba(var(--color-border),0.5)] rounded-lg focus:outline-none focus:border-[rgb(var(--color-primary))]"
                            maxLength={50}
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-1">Bio</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full p-2 bg-[rgb(var(--color-background))] border border-[rgba(var(--color-border),0.5)] rounded-lg h-24 focus:outline-none focus:border-[rgb(var(--color-primary))]"
                            maxLength={160}
                        />
                    </div>
                    
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-[rgb(var(--color-primary))] text-[rgb(var(--color-text-on-primary))] font-bold rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : 'Save Changes'}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

// --- Sub-Components (Reused from Profile_current.tsx for data rendering) ---

const PostMediaRenderer = ({ post }: { post: Post }) => {
    const isImage = post.media_type === 'image';
    const isVideo = post.media_type === 'video';
    
    // Grid view fallback
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
            className="w-full h-full overflow-hidden relative bg-black/5" // Use w-full/h-full for the grid items
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
            whileHover={{ backgroundColor: 'rgba(var(--color-surface-hover), 1)' }}
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
                <div className="rounded-xl overflow-hidden mb-4 border border-[rgba(var(--color-border),0.2)] max-h-[500px] relative bg-black/5">
                    <PostMediaRenderer post={post} />
                </div>
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

// --- Tab Content Components ---

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

const MediaTabContent = ({ posts }: { posts: PostWithProfile[] }) => (
    <div className="grid grid-cols-3 gap-1">
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

const LikesTabContent = () => (
    <div className="text-center py-10 text-[rgb(var(--color-text-secondary))] px-4">
        This view would fetch posts the user has liked from a `likes` table and display them using the PostCard component.
    </div>
);

// ==================================================================
// --- MAIN PROFILE COMPONENT (The Merged Implementation) ---
// ==================================================================

export default function Profile() {
  const { user, profile, updateProfile } = useAuth(); // Get updateProfile for the modal
  const [activeTab, setActiveTab] = useState<TabId>('posts');
  const [userPosts, setUserPosts] = useState<PostWithProfile[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for the new modal

  // ------------------------------------------------------------------
  // 1. DATA FETCHING (from Profile_current.tsx)
  // ------------------------------------------------------------------

  const fetchData = async () => {
    if (!user) return;
    
    // --- Fetch Posts ---
    setLoadingPosts(true);
    const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
            *,
            profiles (id, username, display_name, avatar_url, verified)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (!postsError && postsData) {
        // Safe casting the joined data
        setUserPosts(postsData as PostWithProfile[]);
    } else if (postsError) {
        console.error('Error fetching posts:', postsError);
    }
    setLoadingPosts(false);

    // --- Fetch Follow Stats ---
    setLoadingStats(true);
    
    const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
        supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', user.id),
        supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', user.id),
    ]);

    setFollowStats({ 
        followers: followersCount || 0, 
        following: followingCount || 0 
    });
    setLoadingStats(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, isEditModalOpen]); // Refetch on profile update (modal close)
  
  // ------------------------------------------------------------------
  // 2. Tab Content Filtering
  // ------------------------------------------------------------------
  
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'posts':
        return userPosts;
      case 'media':
        // Only show posts that have a media URL (media_url exists)
        return userPosts.filter(post => post.media_url);
      case 'likes':
        // Placeholder: Returns empty array, will need a dedicated fetch for a real implementation
        return []; 
      default:
        return [];
    }
  }, [activeTab, userPosts]);

  if (!profile) return <div className="p-4 text-center">Loading profile...</div>;

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  // ------------------------------------------------------------------
  // 3. UI RENDERING (From Profile_old.tsx with real data)
  // ------------------------------------------------------------------

  return (
    <>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="pb-24 relative"
        >
          {/* Banner */}
          <div className="h-48 md:h-64 bg-gradient-to-br from-[rgb(var(--color-primary))] to-purple-600 relative overflow-hidden">
            {profile.banner_url ? (
                 <img 
                    src={profile.banner_url} 
                    alt="Profile banner" 
                    className="w-full h-full object-cover" 
                 />
            ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200')] bg-cover bg-center mix-blend-overlay opacity-50"
                />
            )}
          </div>

          {/* Profile Header */}
          <div className="p-4 -mt-16 md:-mt-24">
            <div className="flex justify-between items-end">
              <img 
                src={profile.avatar_url || `https://i.pravatar.cc/150?u=${profile.id}`} 
                className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover bg-[rgb(var(--color-background))] border-4 border-[rgb(var(--color-background))] shadow-lg" 
                alt="Avatar" 
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditModalOpen(true)} // Open the modal
                className="px-6 py-2 rounded-full bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))] font-bold border border-[rgba(var(--color-border),0.5)] hover:bg-[rgb(var(--color-surface-hover))] transition-colors flex items-center gap-2 shadow-md"
              >
                <Settings size={18} />
                Edit Profile
              </motion.button>
            </div>
            
            <div className="mt-4">
              <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
                {profile.display_name}
                {profile.verified && <span className="text-blue-400 text-lg" title="Verified Account">✓</span>}
              </h1>
              <p className="text-[rgb(var(--color-text-secondary))] text-base">@{profile.username}</p>
            </div>

            <p className="mt-3 text-[rgb(var(--color-text))] whitespace-pre-wrap">{profile.bio || 'This user has not set a bio yet.'}</p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[rgb(var(--color-text-secondary))] text-sm mt-3">
                {profile.bio_link && (
                    <div className="flex items-center gap-1">
                        <LinkIcon size={16} />
                        <a href={profile.bio_link} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--color-primary))] hover:underline truncate max-w-[200px]">{profile.bio_link.replace(/https?:\/\//, '')}</a>
                    </div>
                )}
                <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    Joined {joinDate}
                </div>
            </div>
            
            {loadingStats ? (
                <div className="flex items-center gap-4 mt-4">
                    <Loader2 size={18} className="animate-spin text-[rgb(var(--color-primary))]" />
                    <span className="text-sm text-[rgb(var(--color-text-secondary))]">Loading stats...</span>
                </div>
            ) : (
                <div className="flex items-center gap-4 text-[rgb(var(--color-text))] mt-4">
                    <span className="text-base font-bold">{followStats.following}</span>
                    <span className="text-base text-[rgb(var(--color-text-secondary))]">Following</span>
                    
                    <span className="text-base font-bold">{followStats.followers}</span>
                    <span className="text-base text-[rgb(var(--color-text-secondary))]">Followers</span>
                </div>
            )}
          </div>
          
          {/* Tabs (Style from Profile_old.tsx) */}
          <div className="sticky top-0 z-10 bg-[rgba(var(--color-background),0.9)] backdrop-blur-sm border-b border-[rgba(var(--color-border),0.5)]">
            <div className="flex justify-around">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="py-3 px-4 text-center relative flex-1 transition-colors group"
                  >
                    <div className={`flex items-center justify-center gap-2 text-sm font-bold transition-colors ${isActive ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))]'}`}>
                      <tab.icon size={18} />
                      {tab.label}
                    </div>
                    {/* Unique active indicator from Profile_old.tsx */}
                    {isActive && (
                      <motion.div
                        layoutId="active-tab"
                        className="absolute bottom-0 w-16 h-1 rounded-t-full bg-[rgb(var(--color-primary))] left-1/2 -translate-x-1/2"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <div className="absolute inset-0 bg-[rgba(var(--color-text),0.03)] opacity-0 group-hover:opacity-100 transition-opacity rounded-lg m-1" />
                  </button>
                );
              })}
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
                >
                    {activeTab === 'posts' && <PostsTabContent posts={tabContent} />}
                    {activeTab === 'media' && <MediaTabContent posts={tabContent} />}
                    {activeTab === 'likes' && <LikesTabContent />}
                </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
        
        {/* The Edit Profile Modal (Working Placeholder) */}
        <AnimatePresence>
            {isEditModalOpen && (
                <EditProfileModal 
                    isOpen={isEditModalOpen} 
                    onClose={() => setIsEditModalOpen(false)} 
                    currentProfile={profile}
                    updateProfile={async (updates) => {
                        const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
                        if (!error) {
                            // Optimistically update the context profile without a full refetch
                            updateProfile({ ...profile, ...updates });
                        }
                        return error ? Promise.reject(error) : Promise.resolve();
                    }}
                />
            )}
        </AnimatePresence>
    </>
  );
}