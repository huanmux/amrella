// src/components/Profile.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase, Profile as ProfileType, Post, uploadMedia } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BadgeCheck, Edit2, Check, MessageCircle, X, UserMinus, Paperclip, Settings as SettingsIcon, Camera, Crop, Link, LayoutGrid, Grid, ThumbsUp } from 'lucide-react';
import { PostItem, AudioPlayer } from './Post';

const SVG_PATH = "M214.59 81.627c-1.391 3.625-1.8 22.278-.673 30.713 2.126 15.91 7.978 28.209 18.377 38.625 8.015 8.028 16.264 12.279 25.192 12.984l6.987.551.656 4c.36 2.2.452 4.338.204 4.75s-16.119.75-35.27.75c-27.03 0-35.055.286-35.878 1.277-1.207 1.454-6.514 51.381-5.616 52.834.8 1.296 17.805 9.766 35.931 17.898C282.583 272.066 298.351 279 299.52 279c1.629 0 32.848-32.375 33.313-34.547.183-.855-3.275-12.669-7.685-26.253-4.409-13.585-9.509-29.425-11.333-35.2l-3.315-10.5-16.246.124c-8.935.068-17.598.395-19.25.725-2.964.593-3.003.545-2.96-3.624.055-5.301 2.307-11.827 4.661-13.505.987-.703 4.623-3.114 8.08-5.356 12.265-7.955 16.934-17.312 18.211-36.496.444-6.672 1.33-13.109 1.97-14.305 2.586-4.831.031-4.201-5.897 1.452-11.689 11.15-21.44 28.376-25.171 44.471-3.461 14.93-5.903 20.509-5.892 13.464.003-2.172.441-6.61.973-9.86 1.286-7.853-.23-18.167-3.736-25.418-3.789-7.836-13.052-16.799-31.473-30.456-8.538-6.33-15.831-12.005-16.206-12.612-.979-1.584-2.252-1.361-2.974.523M171 260.682c-1.375.268-2.882.854-3.35 1.302-.924.887 6.652 26.164 8.892 29.668.756 1.183 12.981 8.332 27.167 15.887 14.185 7.555 33.059 17.72 41.941 22.588l16.151 8.851 5.349-2.325c2.943-1.278 11.75-4.725 19.573-7.659l14.223-5.334 9.592-12.762c5.276-7.019 10.238-13.297 11.027-13.952 2.632-2.185 1.483-3.79-3.815-5.328-7.221-2.095-55.356-13.369-83.25-19.498-12.65-2.779-29.3-6.485-37-8.235-13.989-3.179-21.789-4.122-26.5-3.203m.504 71.312c-.227.367 1.087 2.896 2.921 5.618 2.958 4.392 10.6 17.779 22.909 40.126 2.192 3.981 5.859 9.156 8.147 11.5 6.4 6.555 44.639 29.762 49.04 29.762 2.295 0 25.842-9.216 26.714-10.456.404-.574.741-12.164.75-25.755l.015-24.712-3.75-.978c-11.319-2.952-18.565-4.671-44.377-10.53-15.605-3.542-35.929-8.421-45.165-10.841s-16.977-4.101-17.204-3.734"
const SVG_VIEWBOX = "0 0 500 500";

// Define the type for the crop result, simplifying for this context
type CropResult = {
  blob: Blob;
  fileName: string;
  fileType: string;
};

// --- START: CROP UTILITY FUNCTIONS (In a real app, these would be in a separate utility file) ---

/**
 * Uses HTML Canvas to perform a center-crop on an image and returns the result as a Blob.
 * The 'scale' parameter simulates zooming into the image's center point.
 * @param imageFile The File object (image) to crop.
 * @param type 'avatar' (1:1 aspect) or 'banner' (~2.5:1 aspect).
 * @param scale The zoom factor (1.0 = no zoom).
 * @returns A Promise that resolves to the cropped Blob or null on failure.
 */
const getCroppedImageBlob = (imageFile: File, type: 'avatar' | 'banner', scale: number): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          console.error("Canvas context not available.");
          return resolve(null);
        }

        // Define target dimensions based on type (simulating standard sizes)
        const targetWidth = type === 'avatar' ? 256 : 500;
        const targetHeight = type === 'avatar' ? 256 : 200; // Aspect ratio of 2.5:1 for banner

        // Set canvas dimensions
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Determine the largest possible crop area within the source image
        const imageAspect = image.width / image.height;
        const cropAspect = canvas.width / canvas.height;
        let sx, sy, sWidth, sHeight;

        if (imageAspect > cropAspect) {
            // Image is wider than crop area (cut left/right)
            sHeight = image.height;
            sWidth = image.height * cropAspect;
            sx = (image.width - sWidth) / 2;
            sy = 0;
        } else {
            // Image is taller than crop area (cut top/bottom)
            sWidth = image.width;
            sHeight = image.width / cropAspect;
            sx = 0;
            sy = (image.height - sHeight) / 2;
        }

        // Apply Zoom (Scale): The crop area in the source image is scaled down by the 'scale' factor.
        // This makes the content within the crop area appear larger (zoomed in).
        const inverseScale = 1 / scale;
        
        sWidth *= inverseScale;
        sHeight *= inverseScale;
        
        // Re-center the crop area after scaling
        sx = image.width / 2 - sWidth / 2;
        sy = image.height / 2 - sHeight / 2;

        // Ensure crop area is within image bounds (clamping)
        // If the scaled crop area (sWidth/sHeight) exceeds the image bounds, clamp it.
        // For simplicity with center crop, we trust the scale is reasonable, but we ensure it doesn't start before 0.
        sx = Math.max(0, sx);
        sy = Math.max(0, sy);
        
        // Final Draw: draw the calculated section (sx, sy, sWidth, sHeight) 
        // onto the entire canvas (0, 0, targetWidth, targetHeight)
        ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

        // Convert canvas to Blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, imageFile.type, 0.95); // Quality 0.95

      };
      image.onerror = () => {
        console.error("Error loading image for cropping.");
        resolve(null);
      };
      image.src = e.target?.result as string;
    };
    reader.onerror = () => {
      console.error("Error reading file for cropping.");
      resolve(null);
    };
    reader.readAsDataURL(imageFile);
  });
};
// --- END: CROP UTILITY FUNCTIONS ---

export const Profile = ({ userId, initialPostId, onMessage, onSettings }: { userId?: string; initialPostId?: string; onMessage?: (profile: ProfileType) => void; onSettings?: () => void }) => {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [bioLink, setBioLink] = useState(''); // NEW: For the bio link
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState<ProfileType[]>([]);
  const [followingList, setFollowingList] = useState<ProfileType[]>([]);

  // STATES FOR LIGHTBOX (Only for Media Tab now)
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxMediaUrl, setLightboxMediaUrl] = useState('');
  const [lightboxMediaType, setLightboxMediaType] = useState<'image' | 'video' | null>(null);

  // NEW STATES FOR PREVIEW/CROPPING
  const [avatarFileToCrop, setAvatarFileToCrop] = useState<File | null>(null);
  const [bannerFileToCrop, setBannerFileToCrop] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('');
  const [showAvatarCropModal, setShowAvatarCropModal] = useState(false);
  const [showBannerCropModal, setShowBannerCropModal] = useState(false);
  const [isCropping, setIsCropping] = useState(false); // Used for both cropping and direct upload status

  // NEW STATES FOR SIMULATED ZOOM
  const [avatarCropScale, setAvatarCropScale] = useState(1.0);
  const [bannerCropScale, setBannerCropScale] = useState(1.0);

  // Social features state (NEW)
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  
  // --- TABS STATE START ---
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'likes'>('posts');
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);
  const [isLikesLoaded, setIsLikesLoaded] = useState(false);
  // --- TABS STATE END ---
  
  // --- POST LIGHTBOX STATE ---
  const [viewingPost, setViewingPost] = useState<Post | null>(null);

  const openLightbox = (url: string, type: 'image' | 'video') => {
    setLightboxMediaUrl(url);
    setLightboxMediaType(type);
    setShowLightbox(true);
  };

  // Helper functions for bio_link
  const formatBioLink = (url: string) => {
    if (!url) return '';
    let displayUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '');
    if (displayUrl.length > 30) {
        return displayUrl.substring(0, 20) + '...';
    }
    return displayUrl;
  };

  const getAbsoluteUrl = (url: string) => {
      if (!url) return '';
      if (!/^(f|ht)tps?:\/\//i.test(url)) {
          return 'https://' + url;
      }
      return url;
  };

  // Helper to fix Supabase returning arrays for single relations
  const formatPostData = (p: any) => ({
    ...p,
    original_post: Array.isArray(p.original_post) ? p.original_post[0] : p.original_post
  });

  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const isOwnProfile = targetUserId === user?.id;

  const avatarFileInput = useRef<HTMLInputElement>(null);
  const bannerFileInput = useRef<HTMLInputElement>(null);

  const isOnline = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return false;
    const now = new Date().getTime();
    const lastSeenTime = new Date(lastSeen).getTime();
    const diff = now - lastSeenTime;
    return diff < 300000; // 5 minutes
  };

  const getPostCounts = useCallback(async (postIds: string[]) => {
    if (!postIds.length) return { likeCounts: {}, commentCounts: {} };

    const likeCounts: Record<string, number> = {};
    const commentCounts: Record<string, number> = {};

    for (const postId of postIds) {
      const [{ count: likeCount }, { count: commentCount }] = await Promise.all([
        supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('entity_type', 'post')
          .eq('entity_id', postId),
        supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
      ]);
      likeCounts[postId] = likeCount || 0;
      commentCounts[postId] = commentCount || 0;
    }

    return { likeCounts, commentCounts };
  }, []);

  /**
   * Helper function to handle direct upload of files (like GIFs) that don't need cropping.
   */
  const handleDirectUpload = async (file: File, type: 'avatar' | 'banner') => {
    setIsCropping(true); 
    try {
        const result = await uploadMedia(file, 'profiles');
        if (result) {
            if (type === 'avatar') {
                setAvatarUrl(result.url);
            } else {
                setBannerUrl(result.url);
            }
        }
    } catch(e) {
        console.error("Direct upload failed:", e);
    } finally {
        setIsCropping(false);
    }
  };

  // UPDATED HANDLERS FOR FILE SELECTION (TO CHECK FOR GIF)
  const handleAvatarFileSelect = (file: File | null) => {
    if (file) {
      if (file.type === 'image/gif') {
        handleDirectUpload(file, 'avatar');
        return;
      }
      const url = URL.createObjectURL(file);
      setAvatarFileToCrop(file);
      setAvatarPreviewUrl(url); 
      setAvatarCropScale(1.0); // Reset scale on new file select
      setShowAvatarCropModal(true);
    } else {
      setAvatarFileToCrop(null);
      setAvatarPreviewUrl('');
    }
  };

  const handleBannerFileSelect = (file: File | null) => {
    if (file) {
      if (file.type === 'image/gif') {
        handleDirectUpload(file, 'banner');
        return;
      }
      const url = URL.createObjectURL(file);
      setBannerFileToCrop(file);
      setBannerPreviewUrl(url); 
      setBannerCropScale(1.0); // Reset scale on new file select
      setShowBannerCropModal(true);
    } else {
      setBannerFileToCrop(null);
      setBannerPreviewUrl('');
    }
  };

  // ACTUAL CROP AND SAVE FUNCTION USING CANVAS LOGIC
  const handleCropAndSave = async (file: File, type: 'avatar' | 'banner') => {
    if (!file) return;

    setIsCropping(true);
    const scale = type === 'avatar' ? avatarCropScale : bannerCropScale;

    try {
        // 1. Perform client-side cropping using Canvas API
        const croppedBlob = await getCroppedImageBlob(file, type, scale);

        if (!croppedBlob) {
            console.error("Cropping failed, received null Blob.");
            return;
        }

        // 2. Create a new File object from the Blob for upload
        const croppedFile = new File([croppedBlob], `cropped-${file.name}`, { type: croppedBlob.type });

        // 3. Upload the cropped file
        const result = await uploadMedia(croppedFile, 'profiles');

        if (result) {
          if (type === 'avatar') {
            setAvatarUrl(result.url);
          } else {
            setBannerUrl(result.url);
          }
        } else {
            console.error("Media upload failed.");
        }
    } catch(e) {
        console.error("An error occurred during crop or upload:", e);
    } finally {
        // 4. Cleanup states regardless of success/failure
        setIsCropping(false);
        if (type === 'avatar') {
            setShowAvatarCropModal(false);
            setAvatarFileToCrop(null);
            setAvatarPreviewUrl('');
        } else {
            setShowBannerCropModal(false);
            setBannerFileToCrop(null);
            setBannerPreviewUrl('');
        }
    }
  };

  /**
   * Social Functions
   */
  const fetchUserLikes = useCallback(async (currentPosts: Post[]) => {
    if (!user || currentPosts.length === 0) return;
    const postIds = currentPosts.map(p => p.id);
    const { data } = await supabase
      .from('likes')
      .select('entity_id')
      .eq('user_id', user.id)
      .eq('entity_type', 'post')
      .in('entity_id', postIds);
    
    if (data) {
      setLikedPostIds(prev => {
        const newSet = new Set(prev);
        data.forEach(d => newSet.add(d.entity_id));
        return newSet;
      });
    }
  }, [user]);

  // Handler passed to PostItem to update state when a post is liked/unliked
  const handleLikeToggle = (updatedPost: Post) => {
    // 1. Update Liked State Set
    setLikedPostIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(updatedPost.id)) {
            newSet.delete(updatedPost.id);
        } else {
            newSet.add(updatedPost.id);
        }
        return newSet;
    });

    // 2. Update Counts in Posts Array
    setPosts(current => current.map(p => {
        if (p.id === updatedPost.id) {
            // If we just toggled, we rely on the updatedPost count OR calculate it.
            // PostItem passes back the object, but usually we need to trust our optimistic toggle direction
            // For safety, we just use the updatedPost object logic from PostItem if it passes it back, 
            // BUT PostItem callback signature in Post.tsx is `onLikeToggle(post)`.
            // We can't know *for sure* the new count without logic, but usually PostItem handles the DB.
            // Let's assume we toggle the count based on our local state knowledge.
            const wasLiked = likedPostIds.has(p.id);
            return { ...p, like_count: Math.max(0, p.like_count + (wasLiked ? -1 : 1)) };
        }
        return p;
    }));

    // 3. Update Counts in LikedPosts Array
    setLikedPosts(current => {
        // If we unliked it, and we are viewing the Liked tab, we might want to remove it?
        // Or just update the heart. Usually, removing it immediately is jarring.
        return current.map(p => {
            if (p.id === updatedPost.id) {
                const wasLiked = likedPostIds.has(p.id);
                return { ...p, like_count: Math.max(0, p.like_count + (wasLiked ? -1 : 1)) };
            }
            return p;
        });
    });
    
    // 4. Update viewing post if open
    if (viewingPost && viewingPost.id === updatedPost.id) {
        setViewingPost(prev => {
           if (!prev) return null;
           const wasLiked = likedPostIds.has(prev.id);
           return { ...prev, like_count: Math.max(0, prev.like_count + (wasLiked ? -1 : 1)) };
        });
    }
  };

  const handleCommentUpdate = (updatedPost: Post) => {
     setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, comment_count: updatedPost.comment_count } : p));
     setLikedPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, comment_count: updatedPost.comment_count } : p));
     if (viewingPost && viewingPost.id === updatedPost.id) {
         setViewingPost(prev => prev ? { ...prev, comment_count: updatedPost.comment_count } : null);
     }
  };
  
  const handleDeletePost = async (post: Post) => {
      // Optimistic update
      setPosts(prev => prev.filter(p => p.id !== post.id));
      setLikedPosts(prev => prev.filter(p => p.id !== post.id));
      if (viewingPost && viewingPost.id === post.id) setViewingPost(null);
      
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) {
          console.error("Failed to delete post", error);
          loadPosts(); // Revert/Reload
      }
  };

  const loadProfile = useCallback(async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();
    setProfile(data);
    if (data) {
      setDisplayName(data.display_name);
      setBio(data.bio || '');
      setBioLink(data.bio_link || ''); // NEW
      setAvatarUrl(data.avatar_url || '');
      setBannerUrl(data.banner_url || '');
    }
  }, [targetUserId]);

  const loadPosts = useCallback(async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(*), original_post:posts!repost_of(*, profiles(*))')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });
    const loadedPosts = (data || []).map(formatPostData)
    const postIds = loadedPosts.map(p => p.id);
    const { likeCounts, commentCounts } = await getPostCounts(postIds);
    const postsWithCounts = loadedPosts.map(post => ({
      ...post,
      like_count: likeCounts[post.id] || 0,
      comment_count: commentCounts[post.id] || 0,
    }));
    setPosts(postsWithCounts);
    fetchUserLikes(postsWithCounts); // NEW: Fetch likes for loaded posts
  }, [targetUserId, fetchUserLikes, getPostCounts]);
  
  // --- NEW: Load Liked Posts ---
  const loadLikedPosts = useCallback(async () => {
    if (!targetUserId) return;
    
    setIsLoadingLikes(true);
    
    // 1. Find all post IDs this user has liked
    const { data: likeData } = await supabase
      .from('likes')
      .select('entity_id')
      .eq('user_id', targetUserId)
      .eq('entity_type', 'post');
      
    if (!likeData || likeData.length === 0) {
      setLikedPosts([]);
      setIsLikesLoaded(true);
      setIsLoadingLikes(false);
      return;
    }
    
    // 2. Fetch all posts matching those IDs
    const postIds = likeData.map(l => l.entity_id);
    const { data: postData } = await supabase
      .from('posts')
      // Added: original_post:posts!repost_of(*, profiles(*))
      .select('*, profiles(*), original_post:posts!repost_of(*, profiles(*))')
      .in('id', postIds)
      .order('created_at', { ascending: false });
      
    const loadedLikedPosts = (postData || []).map(formatPostData);
    const newPostIds = loadedLikedPosts.map(p => p.id);
    const { likeCounts, commentCounts } = await getPostCounts(newPostIds);
    const likedPostsWithCounts = loadedLikedPosts.map(post => ({
      ...post,
      like_count: likeCounts[post.id] || 0,
      comment_count: commentCounts[post.id] || 0,
    }));
    setLikedPosts(likedPostsWithCounts);
    
    // 3. Fetch *our* (the viewing user's) likes for *these* posts
    fetchUserLikes(likedPostsWithCounts);
    
    setIsLikesLoaded(true);
    setIsLoadingLikes(false);
  }, [targetUserId, fetchUserLikes, getPostCounts]);

  const loadFollowStats = useCallback(async () => {
    if (!targetUserId) return;
    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', targetUserId);

    const { count: followingC } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', targetUserId);

    setFollowerCount(followers || 0);
    setFollowingCount(followingC || 0);
  }, [targetUserId]);

  const checkFollowing = useCallback(async () => {
    if (!user || !targetUserId) return;
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle();
    setIsFollowing(!!data);
  }, [user, targetUserId]);

  useEffect(() => {
    if (targetUserId) {
      // Reset tab-specific data on profile change
      setActiveTab('posts');
      setIsLikesLoaded(false);
      setLikedPosts([]);
      
      loadProfile();
      loadPosts();
      loadFollowStats();
      if (!isOwnProfile) checkFollowing();

      const channel = supabase.channel(`profile-${targetUserId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        if (payload.new.user_id !== targetUserId) return;
        const { data } = await supabase.from('posts').select('*, profiles(*), original_post:posts!repost_of(*, profiles(*))').eq('id', payload.new.id).single();
        if (data) {
          const formattedData = formatPostData(data);
          const postIds = [formattedData.id];
          const { likeCounts, commentCounts } = await getPostCounts(postIds);
          const newPost = {
            ...data,
            like_count: likeCounts[data.id] || 0,
            comment_count: commentCounts[data.id] || 0,
          };
          setPosts(current => [newPost, ...current]);
        }
      }).on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        const postId = payload.old.id;
        setPosts(current => current.filter(p => p.id !== postId));
        setLikedPosts(current => current.filter(p => p.id !== postId));
      }).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes', filter: 'entity_type=eq.post' }, async (payload) => {
        if (payload.new.user_id === targetUserId) {
          // Add to likedPosts
          const { data: postData } = await supabase.from('posts').select('*, profiles(*), original_post:posts!repost_of(*, profiles(*))').eq('id', payload.new.entity_id).single();
          if (postData) {
            const formattedData = formatPostData(postData);
            const postIds = [formattedData.id];
            const { likeCounts, commentCounts } = await getPostCounts(postIds);
            const newPost = {
              ...postData,
              like_count: likeCounts[postData.id] || 0,
              comment_count: commentCounts[postData.id] || 0,
            };
            setLikedPosts(current => {
              if (current.some(p => p.id === newPost.id)) return current; // already there
              return [newPost, ...current];
            });
          }
        }
        // Always update count
        const postId = payload.new.entity_id;
        setPosts(current => current.map(p => p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p));
        setLikedPosts(current => current.map(p => p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p));
      }).on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes', filter: 'entity_type=eq.post' }, (payload) => {
        if (payload.old.user_id === targetUserId) {
          setLikedPosts(current => current.filter(p => p.id !== payload.old.entity_id));
        }
        // Update count
        const postId = payload.old.entity_id;
        setPosts(current => current.map(p => p.id === postId ? { ...p, like_count: Math.max(0, (p.like_count || 0) - 1) } : p));
        setLikedPosts(current => current.map(p => p.id === postId ? { ...p, like_count: Math.max(0, (p.like_count || 0) - 1) } : p));
      }).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
        const postId = payload.new.post_id;
        setPosts(current => current.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
        setLikedPosts(current => current.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
      }).subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [targetUserId, isOwnProfile, loadProfile, loadPosts, loadFollowStats, checkFollowing, getPostCounts]);
  
  // --- HANDLE INITIAL POST LOAD ---
  useEffect(() => {
      if (initialPostId) {
          const fetchPost = async () => {
              const { data } = await supabase
                  .from('posts')
                  .select('*, profiles(*), original_post:posts!repost_of(*, profiles(*))')
                  .eq('id', initialPostId)
                  .maybeSingle(); // Use maybeSingle for safety
              
              if (data) {
                const formattedData = formatPostData(data);
                  // Default to 0 if counts fail to load for any reason
                  let lCount = 0;
                  let cCount = 0;
                  try {
                    const { likeCounts, commentCounts } = await getPostCounts([data.id]);
                    lCount = likeCounts[data.id] || 0;
                    cCount = commentCounts[data.id] || 0;
                  } catch (e) { console.error("Error loading counts", e); }

                  const postWithCounts = {
                      ...data,
                      like_count: lCount,
                      comment_count: cCount
                  };
                  setViewingPost(postWithCounts);
                  // Only fetch likes if we have a user (prevents errors in public view)
                  if (user) fetchUserLikes([postWithCounts]);
              }
          };
          fetchPost();
      }
  }, [initialPostId]); // Reduced dependencies to avoid loops


  const loadFollowers = async () => {
    const { data } = await supabase
      .from('follows')
      .select('follower:profiles!follower_id(*)')
      .eq('following_id', targetUserId);
    setFollowersList(data?.map((f: any) => f.follower) || []);
  };

  const loadFollowing = async () => {
    const { data } = await supabase
      .from('follows')
      .select('following:profiles!following_id(*)')
      .eq('follower_id', targetUserId);
    setFollowingList(data?.map((f: any) => f.following) || []);
  };

  const openFollowers = async () => {
    await loadFollowers();
    setShowFollowers(true);
    setShowFollowing(false);
  };

  const openFollowing = async () => {
    await loadFollowing();
    setShowFollowing(true);
    setShowFollowers(false);
  };

  const closeModal = () => {
    setShowFollowers(false);
    setShowFollowing(false);
  };

  const toggleFollow = async () => {
    if (!user) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
    }
    setIsFollowing(!isFollowing);
    loadFollowStats();
  };

  const toggleFollowUser = async (targetId: string) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', targetId)
      .maybeSingle();

    if (existing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
    }

    if (showFollowers) await loadFollowers();
    if (showFollowing) await loadFollowing();
    loadFollowStats();
  };

  // FIXED: Now calls an RPC to bypass RLS safely
  const removeFollower = async (followerId: string) => {
    // Call the 'remove_follower' database function we created
    const { error } = await supabase.rpc('remove_follower', {
      p_follower_id: followerId
    });

    if (!error) {
      // The DB call was successful, now update the UI
      setFollowersList(prev => prev.filter(p => p.id !== followerId));
      setFollowerCount(prev => prev - 1);
    } else {
      // The RPC returned an error, log it
      console.error('Error removing follower:', error);
    }
  };

  const updateProfile = async () => {
    await supabase
      .from('profiles')
      .update({ display_name: displayName, bio, bio_link: bioLink, avatar_url: avatarUrl, banner_url: bannerUrl }) // UPDATED with bio_link
      .eq('id', user!.id);
    setIsEditing(false);
    loadProfile();
  };

  const goToProfile = async (profileId: string) => {
    closeModal();
    setViewingPost(null); // Close modal if navigating
    const { data } = await supabase.from('profiles').select('username').eq('id', profileId).single();
    if (data) {
      window.history.replaceState({}, '', `/?user=${data.username}`);
      window.dispatchEvent(new CustomEvent('navigateToProfile', { detail: profileId }));
    }
  };
  
  // --- NEW: Handle Tab Click ---
  const handleTabClick = (tab: 'posts' | 'media' | 'likes') => {
    setActiveTab(tab);
    if (tab === 'likes' && !isLikesLoaded && !isLoadingLikes) {
      loadLikedPosts();
    }
  };
  
  // --- NEW: Memoize Media Posts ---
  const mediaPosts = useCallback(() => {
    return posts.filter(p => p.media_url && (p.media_type === 'image' || p.media_type === 'video'));
  }, [posts])();

  if (!profile) return <div className="text-center p-8 text-[rgb(var(--color-text))]">Loading...</div>;

  // Real-time preview URLs: prioritize newly selected file preview, then the current state URL, then the loaded profile URL.
  const currentBannerUrl = isEditing && bannerPreviewUrl ? bannerPreviewUrl : bannerUrl || profile.banner_url;
  const currentAvatarUrl = isEditing && avatarPreviewUrl ? avatarPreviewUrl : avatarUrl || profile.avatar_url;


  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[rgb(var(--color-surface))]">
        <div className="relative h-48 bg-[rgb(var(--color-border))]">
          {/* BANNER PREVIEW / CLICK SHORTCUT */}
          {currentBannerUrl ? (
            <button
              onClick={() => isOwnProfile && isEditing && bannerFileInput.current?.click()}
              className={`w-full h-full ${isOwnProfile && isEditing ? 'cursor-pointer group' : ''}`}
              disabled={!isOwnProfile || !isEditing}
            >
              <img src={currentBannerUrl} className="w-full h-full object-cover" alt="Banner" />
              {isOwnProfile && isEditing && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={48} className="text-white" />
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => isOwnProfile && isEditing && bannerFileInput.current?.click()}
              className={`w-full h-full ${isOwnProfile && isEditing ? 'cursor-pointer group' : ''}`}
              disabled={!isOwnProfile || !isEditing}
            >
              <div className="w-full h-full bg-gradient-to-br from-[rgba(var(--color-accent),1)] to-[rgba(var(--color-primary),1)] flex items-center justify-center">
                {isOwnProfile && isEditing && <Camera size={48} className="text-white" />}
              </div>
            </button>
          )}
        </div>

        <div className="relative px-4 pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-16">
            {/* AVATAR PREVIEW / CLICK SHORTCUT */}
            <button
              onClick={() => {
                if (isOwnProfile && isEditing) {
                  avatarFileInput.current?.click();
                } else if (!isOwnProfile) {
                  goToProfile(profile.id);
                }
              }}
              className={`relative ${isOwnProfile && isEditing ? 'group cursor-pointer' : ''}`}
            >
              <img
                // Use currentAvatarUrl for real-time preview
                src={currentAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                className="w-32 h-32 rounded-full border-4 border-[rgb(var(--color-surface))] shadow-lg ring-4 ring-[rgb(var(--color-surface))] hover:opacity-90 transition object-cover"
                alt="Avatar"
              />
              {isOnline(profile.last_seen) && (
                <span className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-[rgb(var(--color-surface))] rounded-full" />
              )}
              {isOwnProfile && isEditing && (
                <div className="absolute inset-0 w-32 h-32 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={32} className="text-white" />
                </div>
              )}
            </button>

            <div className="mt-4 sm:mt-0 flex gap-2">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => (isEditing ? updateProfile() : setIsEditing(true))}
                    className="px-5 py-2.5 border border-[rgb(var(--color-border))] text-[rgb(var(--color-text))] rounded-full font-semibold hover:bg-[rgb(var(--color-surface-hover))] flex items-center gap-2 transition"
                  >
                    {isEditing ? <Check size={18} /> : <Edit2 size={18} />}
                    {isEditing ? 'Save' : 'Edit Profile'}
                  </button>
                  {onSettings && (
                    <button
                      onClick={onSettings}
                      className="px-5 py-2.5 border border-[rgb(var(--color-border))] text-[rgb(var(--color-text))] rounded-full font-semibold hover:bg-[rgb(var(--color-surface-hover))] flex items-center gap-2 transition"
                    >
                      <SettingsIcon size={18} />
                      Settings
                    </button>
                  )}
                </>
              ) : (
                <>
                 <button
  onClick={() => {
    if (!profile?.username) return;

    // 1. Set URL
    window.history.replaceState({}, '', `/message?${profile.username}`);

    // 2. Trigger App.tsx handler (which will set view and dispatch event)
    onMessage?.(profile);
  }}
  className="flex items-center gap-2 px-5 py-2.5 bg-[rgb(var(--color-accent))] text-[rgb(var(--color-text-on-primary))] rounded-full hover:bg-[rgb(var(--color-primary))] transition font-medium"
>
  <MessageCircle size={18} />
  Message
</button>
                  <button
                    onClick={toggleFollow}
                    className={`px-6 py-2.5 rounded-full font-semibold transition ${
                      isFollowing ? 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))] border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-surface-hover))]' : 'bg-[rgb(var(--color-text))] text-[rgb(var(--color-background))] hover:bg-[rgb(var(--color-surface))]'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="mt-6 space-y-3">
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name" className="w-full px-4 py-2.5 border border-[rgb(var(--color-border))] rounded-lg focus:outline-none focus:border-[rgb(var(--color-accent))] bg-[rgb(var(--color-background))] text-[rgb(var(--color-text))]" />
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={3} className="w-full px-4 py-2.5 border border-[rgb(var(--color-border))] rounded-lg focus:outline-none focus:border-[rgb(var(--color-accent))] resize-none bg-[rgb(var(--color-background))] text-[rgb(var(--color-text))]" />
              {/* NEW: Bio Link Input */}
              <input type="url" value={bioLink} onChange={(e) => setBioLink(e.target.value)} placeholder="Bio Link (e.g., yourwebsite.com)" className="w-full px-4 py-2.5 border border-[rgb(var(--color-border))] rounded-lg focus:outline-none focus:border-[rgb(var(--color-accent))] bg-[rgb(var(--color-background))] text-[rgb(var(--color-text))]" />
              {/* AVATAR UPLOAD FIELD (HIDDEN) */}
              <div className="flex items-center gap-2">
                <input 
                  type="url" 
                  value={avatarUrl} 
                  onChange={(e) => setAvatarUrl(e.target.value)} 
                  placeholder="Avatar URL" 
                  className="flex-1 px-4 py-2.5 border border-[rgb(var(--color-border))] rounded-lg focus:outline-none focus:border-[rgb(var(--color-accent))] bg-[rgb(var(--color-background))] text-[rgb(var(--color-text))]" 
                />
                <button 
                  type="button" 
                  onClick={() => avatarFileInput.current?.click()} 
                  className="px-4 py-2 bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-secondary))] rounded-lg hover:bg-[rgb(var(--color-border))] transition flex items-center gap-2"
                >
                  <Paperclip size={16} />
                </button>
                <input 
                  ref={avatarFileInput} 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleAvatarFileSelect(e.target.files?.[0] || null)}
                  className="hidden" 
                />
              </div>
              {/* BANNER UPLOAD FIELD (HIDDEN) */}
              <div className="flex items-center gap-2">
                <input 
                  type="url" 
                  value={bannerUrl} 
                  onChange={(e) => setBannerUrl(e.target.value)} 
                  placeholder="Banner URL" 
                  className="flex-1 px-4 py-2.5 border border-[rgb(var(--color-border))] rounded-lg focus:outline-none focus:border-[rgb(var(--color-accent))] bg-[rgb(var(--color-background))] text-[rgb(var(--color-text))]" 
                />
                <button 
                  type="button" 
                  onClick={() => bannerFileInput.current?.click()} 
                  className="px-4 py-2 bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-secondary))] rounded-lg hover:bg-[rgb(var(--color-border))] transition flex items-center gap-2"
                >
                  <Paperclip size={16} />
                </button>
                <input 
                  ref={bannerFileInput} 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleBannerFileSelect(e.target.files?.[0] || null)}
                  className="hidden" 
                />
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <div className="flex items-center gap-2">
                <button onClick={() => !isOwnProfile && goToProfile(profile.id)} className="font-bold text-2xl text-[rgb(var(--color-text))] hover:underline">
                  {profile.display_name}
                </button>
                {profile.verified && <BadgeCheck size={22} className="text-[rgb(var(--color-accent))]" />}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[rgb(var(--color-text-secondary))]">@{profile.username}</p>
                {/* --- CUSTOM BADGE --- */}
                {(profile as any).badge_url && (
                  <div className="group relative inline-flex items-center justify-center h-5 px-2 min-w-[20px] rounded bg-[rgb(var(--color-surface-hover))] overflow-visible align-middle select-none">
                    <div className="absolute inset-0 bg-cover bg-center rounded" style={{ backgroundImage: `url(${(profile as any).badge_url})` }} />
                    {(profile as any).badge_text && (
                       <span className="relative z-10 text-[9px] font-black text-white uppercase tracking-widest drop-shadow-md shadow-black">{(profile as any).badge_text}</span>
                    )}
                    {(profile as any).badge_tooltip && (
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 w-max max-w-[150px] px-2 py-1 bg-black/90 backdrop-blur text-white text-xs rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 text-center shadow-xl">
                        {(profile as any).badge_tooltip}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {profile.bio && <p className="mt-3 text-[rgb(var(--color-text))]">{profile.bio}</p>}
              <div className="mt-4 flex gap-8 items-center text-sm"> {/* UPDATED: added items-center */}
                <button onClick={openFollowing} className="hover:underline text-[rgb(var(--color-text))]">
                  <strong className="text-lg">{followingCount}</strong> <span className="text-[rgb(var(--color-text-secondary))]">Following</span>
                </button>
                <button onClick={openFollowers} className="hover:underline text-[rgb(var(--color-text))]">
                  <strong className="text-lg">{followerCount}</strong> <span className="text-[rgb(var(--color-text-secondary))]">Followers</span>
                </button>
                {/* NEW: Bio Link Display */}
                {profile.bio_link && (
                  <a
                    href={getAbsoluteUrl(profile.bio_link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[rgb(var(--color-accent))] hover:underline hover:text-[rgb(var(--color-primary))] transition"
                  >
                    <Link size={16} />
                    <span className="truncate max-w-[150px]">{formatBioLink(profile.bio_link)}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- TABS START --- */}
      <div className="flex border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] sticky top-0 z-30">
        <button 
          onClick={() => handleTabClick('posts')}
          className={`flex-1 py-4 font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'posts' 
            ? 'text-[rgb(var(--color-accent))] border-b-2 border-[rgb(var(--color-accent))]' 
            : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface-hover))]'
          }`}
        >
          <LayoutGrid size={18} />
          Posts
        </button>
        <button 
          onClick={() => handleTabClick('media')}
          className={`flex-1 py-4 font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'media' 
            ? 'text-[rgb(var(--color-accent))] border-b-2 border-[rgb(var(--color-accent))]' 
            : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface-hover))]'
          }`}
        >
          <Grid size={18} />
          Media
        </button>
        <button 
          onClick={() => handleTabClick('likes')}
          className={`flex-1 py-4 font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'likes' 
            ? 'text-[rgb(var(--color-accent))] border-b-2 border-[rgb(var(--color-accent))]' 
            : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface-hover))]'
          }`}
        >
          <ThumbsUp size={18} />
          Likes
        </button>
      </div>
      {/* --- TABS END --- */}

      <div>
        {/* --- POSTS TAB CONTENT --- */}
        {activeTab === 'posts' && (
          <div>
            {posts.length === 0 && (
              <div className="text-center p-8 text-[rgb(var(--color-text-secondary))]">This user hasn't posted anything yet.</div>
            )}
            {posts.map((post) => (
               <PostItem 
                 key={post.id}
                 post={post}
                 currentUserId={user?.id}
                 isLiked={likedPostIds.has(post.id)}
                 onLikeToggle={handleLikeToggle}
                 onCommentUpdate={handleCommentUpdate}
                 onNavigateToProfile={goToProfile}
                 onDelete={handleDeletePost}
               />
            ))}
          </div>
        )}

        {/* --- MEDIA TAB CONTENT --- */}
        {activeTab === 'media' && (
          <div>
            {mediaPosts.length === 0 ? (
              <div className="text-center p-8 text-[rgb(var(--color-text-secondary))]">This user hasn't posted any media.</div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {mediaPosts.map((post) => (
                  <button 
                    key={post.id} 
                    className="aspect-square relative bg-[rgb(var(--color-border))] hover:opacity-80 transition"
                    onClick={() => openLightbox(post.media_url, post.media_type === 'video' ? 'video' : 'image')}
                  >
                    {post.media_type === 'image' && (
                      <img src={post.media_url} alt="Media" className="w-full h-full object-cover" />
                    )}
                    {post.media_type === 'video' && (
                      <>
                        <video src={post.media_url} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full">
                          <Camera size={16} className="text-white" />
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- LIKES TAB CONTENT --- */}
        {activeTab === 'likes' && (
          <div>
            {isLoadingLikes && (
              <div className="flex justify-center p-8">
                <div className="logo-loading-container w-8 h-8 relative">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox={SVG_VIEWBOX}
                        className="logo-svg"
                    >
                        <defs>
                            <clipPath id="logo-clip">
                                <rect
                                    id="clip-rect"
                                    x="0"
                                    y="0"
                                    width="100%"
                                    height="100%"
                                />
                            </clipPath>
                        </defs>
                        <path
                            d={SVG_PATH}
                            fill="none"
                            stroke="rgb(var(--color-primary))"
                            strokeWidth="10"
                            strokeOpacity="0.1" 
                        />
                        <path
                            d={SVG_PATH}
                            fill="rgb(var(--color-primary))" 
                            clipPath="url(#logo-clip)"
                            className="logo-fill-animated"
                        />
                    </svg>
                </div>
              </div>
            )}

            {!isLoadingLikes && isLikesLoaded && likedPosts.length === 0 && (
              <div className="text-center p-8 text-[rgb(var(--color-text-secondary))]">This user hasn't liked any posts yet.</div>
            )}

            {!isLoadingLikes && isLikesLoaded && likedPosts.map((post) => (
               <PostItem 
                 key={post.id}
                 post={post}
                 currentUserId={user?.id}
                 isLiked={likedPostIds.has(post.id)}
                 onLikeToggle={handleLikeToggle}
                 onCommentUpdate={handleCommentUpdate}
                 onNavigateToProfile={goToProfile}
                 onDelete={handleDeletePost}
               />
            ))}
          </div>
        )}
      </div>
      
      {/* --- POST LIGHTBOX MODAL --- */}
      {viewingPost && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => { setViewingPost(null); window.history.replaceState({}, '', '/'); }}>
              <div className="bg-[rgb(var(--color-surface))] w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-y-auto border border-[rgb(var(--color-border))]" onClick={e => e.stopPropagation()}>
                  <div className="sticky top-0 z-10 bg-[rgb(var(--color-surface))] border-b border-[rgb(var(--color-border))] p-4 flex justify-between items-center">
                      <h3 className="font-bold text-lg">Post</h3>
                      <button onClick={() => { setViewingPost(null); window.history.replaceState({}, '', '/'); }} className="p-1 rounded-full hover:bg-[rgb(var(--color-surface-hover))]">
                          <X size={24} />
                      </button>
                  </div>
                  <PostItem 
                     post={viewingPost}
                     currentUserId={user?.id}
                     isLiked={likedPostIds.has(viewingPost.id)}
                     onLikeToggle={handleLikeToggle}
                     onCommentUpdate={handleCommentUpdate}
                     onNavigateToProfile={goToProfile}
                     onDelete={handleDeletePost}
                  />
              </div>
          </div>
      )}

      {/* AVATAR CROP MODAL (with actual cropping logic and zoom simulation) */}
      {showAvatarCropModal && avatarFileToCrop && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => !isCropping && setShowAvatarCropModal(false)}>
          <div className="bg-[rgb(var(--color-surface))] rounded-2xl w-full max-w-lg flex flex-col p-6 text-[rgb(var(--color-text))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xl flex items-center gap-2"><Crop size={20} /> Crop Avatar</h3>
                <button 
                  onClick={() => setShowAvatarCropModal(false)} 
                  className="p-2 text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-hover))] rounded-full"
                  disabled={isCropping}
                >
                    <X size={20} />
                </button>
            </div>
            <div className="flex justify-center items-center h-80 w-full bg-[rgb(var(--color-background))] rounded-lg overflow-hidden relative mb-4">
                {/* Image preview showing the effect of the scale on the image */}
                <img 
                  src={avatarPreviewUrl} 
                  className="max-w-full max-h-full object-contain" 
                  alt="Avatar Crop Preview" 
                  style={{ transform: `scale(${avatarCropScale})` }} // Visual Zoom Simulation
                />
                {/* Visual guide for the 1:1 square crop area */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-4 border-dashed border-white/80 rounded-full shadow-lg" />
                    <div className="absolute inset-0 bg-black/50" 
                      style={{ 
                        clipPath: 'circle(128px at center)',
                        mixBlendMode: 'saturation' // Darken/desaturate outside area
                      }}
                    />
                    {isCropping && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-xl font-bold">
                            Processing...
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4">
                <label className="block text-sm font-medium mb-1 text-[rgb(var(--color-text))]">Zoom Level ({avatarCropScale.toFixed(1)}x)</label>
                <input 
                    type="range" 
                    min="1.0" 
                    max="3.0" 
                    step="0.1" 
                    value={avatarCropScale} 
                    onChange={(e) => setAvatarCropScale(parseFloat(e.target.value))} 
                    className="w-full h-2 bg-[rgb(var(--color-border))] rounded-lg appearance-none cursor-pointer range-lg"
                    disabled={isCropping}
                />
                <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">Adjusting zoom scales the image content for the **center crop** area.</p>
            </div>
            
            <button
              onClick={() => handleCropAndSave(avatarFileToCrop, 'avatar')}
              className="w-full py-3 bg-[rgba(var(--color-accent),1)] text-[rgb(var(--color-text-on-primary))] rounded-full font-semibold hover:bg-[rgba(var(--color-primary),1)] transition disabled:opacity-50 mt-4"
              disabled={isCropping}
            >
              {isCropping ? 'Cropping & Uploading...' : 'Crop & Save Avatar'}
            </button>
          </div>
        </div>
      )}

      {/* BANNER CROP MODAL (with actual cropping logic and zoom simulation) */}
      {showBannerCropModal && bannerFileToCrop && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => !isCropping && setShowBannerCropModal(false)}>
          <div className="bg-[rgb(var(--color-surface))] rounded-2xl w-full max-w-2xl flex flex-col p-6 text-[rgb(var(--color-text))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xl flex items-center gap-2"><Crop size={20} /> Crop Banner</h3>
                <button 
                  onClick={() => setShowBannerCropModal(false)} 
                  className="p-2 text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-hover))] rounded-full"
                  disabled={isCropping}
                >
                    <X size={20} />
                </button>
            </div>
            <div className="flex justify-center items-center h-48 w-full bg-[rgb(var(--color-background))] rounded-lg overflow-hidden relative mb-4">
                {/* Image preview showing the effect of the scale on the image */}
                <img 
                  src={bannerPreviewUrl} 
                  className="w-full h-full object-cover" 
                  alt="Banner Crop Preview" 
                  style={{ transform: `scale(${bannerCropScale})` }} // Visual Zoom Simulation
                />
                {/* Visual guide for the approx 2.5:1 banner crop area */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Simplified visual: a central box representing the 2.5:1 crop (e.g., 500x200) */}
                    <div className="w-11/12 h-3/5 border-4 border-dashed border-white/80 shadow-lg" />
                    <div className="absolute inset-0 bg-black/50" 
                        style={{ 
                            clipPath: 'polygon(0% 0%, 0% 100%, 5% 100%, 5% 20%, 95% 20%, 95% 80%, 5% 80%, 5% 100%, 100% 100%, 100% 0%)',
                            mixBlendMode: 'saturation' // Darken/desaturate outside area
                        }}
                    />
                    {isCropping && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-xl font-bold">
                            Processing...
                        </div>
                    )}
                </div>
            </div>
            
            <div className="mt-4">
                <label className="block text-sm font-medium mb-1 text-[rgb(var(--color-text))]">Zoom Level ({bannerCropScale.toFixed(1)}x)</label>
                <input 
                    type="range" 
                    min="1.0" 
                    max="3.0" 
                    step="0.1" 
                    value={bannerCropScale} 
                    onChange={(e) => setBannerCropScale(parseFloat(e.target.value))} 
                    className="w-full h-2 bg-[rgb(var(--color-border))] rounded-lg appearance-none cursor-pointer range-lg"
                    disabled={isCropping}
                />
                <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">Adjusting zoom scales the image content for the **center crop** area.</p>
            </div>

            <button
              onClick={() => handleCropAndSave(bannerFileToCrop, 'banner')}
              className="w-full py-3 bg-[rgba(var(--color-accent),1)] text-[rgb(var(--color-text-on-primary))] rounded-full font-semibold hover:bg-[rgba(var(--color-primary),1)] transition disabled:opacity-50 mt-4"
              disabled={isCropping}
            >
              {isCropping ? 'Cropping & Uploading...' : 'Crop & Save Banner'}
            </button>
          </div>
        </div>
      )}

      {/* FOLLOWERS/FOLLOWING MODALS (existing) */}
      {(showFollowers || showFollowing) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-[rgb(var(--color-surface))] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[rgb(var(--color-border))]">
              <h3 className="font-bold text-lg text-[rgb(var(--color-text))]">{showFollowers ? 'Followers' : 'Following'}</h3>
              <button onClick={closeModal} className="p-2 text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-hover))] rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {(showFollowers ? followersList : followingList).map((p) => {
                const isFollowingThisUser = followingList.some(f => f.id === p.id);
                const isMe = p.id === user?.id;

                return (
                  <div key={p.id} className="flex items-center justify-between p-4 hover:bg-[rgb(var(--color-surface-hover))] border-b border-[rgb(var(--color-border))]">
                    <button onClick={() => goToProfile(p.id)} className="flex items-center gap-3 flex-1 text-left">
                      <div className="relative flex-shrink-0">
                        <img
                          src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`}
                          className="w-10 h-10 rounded-full"
                          alt=""
                        />
                        {isOnline(p.last_seen) && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[rgb(var(--color-surface))] rounded-full" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-[rgb(var(--color-text))]">{p.display_name}</div>
                        <div className="text-sm text-[rgb(var(--color-text-secondary))]">@{p.username}</div>
                      </div>
                    </button>

                    {isOwnProfile && !isMe && (
                      <div className="flex gap-2">
                        {showFollowers && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFollower(p.id);
                            }}
                            className="px-3 py-1.5 text-sm font-medium rounded-full border border-red-300 text-red-600 hover:bg-red-50 transition"
                          >
                            <UserMinus size={16} className="inline mr-1" />
                            Remove
                          </button>
                        )}
                        {showFollowing && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFollowUser(p.id);
                            }}
                            className={`px-4 py-1.5 text-sm font-medium rounded-full border transition ${
                              isFollowingThisUser ? 'border-[rgb(var(--color-border))] text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-hover))]' : 'bg-[rgb(var(--color-text))] text-[rgb(var(--color-background))] hover:bg-[rgb(var(--color-surface))]'
                            }`}
                          >
                            {isFollowingThisUser ? 'Following' : 'Follow'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX (existing - Only for Media tab now) */}
      {showLightbox && lightboxMediaUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowLightbox(false)}
        >
          <div className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            {lightboxMediaType === 'image' && (
              <img 
                src={lightboxMediaUrl} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
                alt="Full size view"
              />
            )}
            {lightboxMediaType === 'video' && (
              <video 
                controls 
                autoPlay
                className="max-w-full max-h-[90vh] rounded-2xl"
              >
                <source src={lightboxMediaUrl} />
                Your browser does not support the video tag.
              </video>
            )}
          </div>
          <button 
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition"
          >
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  );
};
