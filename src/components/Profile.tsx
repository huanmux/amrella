// src/components/Profile.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase, Profile as ProfileType, Post, uploadMedia } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PostItem } from './Post';
import {
  Box, Avatar, Button, Typography, IconButton, Badge, Tabs, Tab, Dialog, DialogContent,
  DialogTitle, DialogActions, Slider, CircularProgress, Skeleton, AppBar, Toolbar,
  Chip, Tooltip, TextField, InputAdornment, alpha
} from '@mui/material';
import {
  Edit as EditIcon, Check as CheckIcon, Message as MessageIcon, Settings as SettingsIcon,
  CameraAlt as CameraIcon, Crop as CropIcon, Close as CloseIcon, Link as LinkIcon,
  GridView as GridIcon, FormatListBulleted as ListIcon, ThumbUp as LikesIcon,
  PersonRemove as RemoveFollowerIcon, Visibility as ViewIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const SVG_PATH = "M214.59 81.627c-1.391 3.625-1.8 22.278-.673 30.713 2.126 15.91 7.978 28.209 18.377 38.625 8.015 8.028 16.264 12.279 25.192 12.984l6.987.551.656 4c.36 2.2.452 4.338.204 4.75s-16.119.75-35.27.75c-27.03 0-35.055.286-35.878 1.277-1.207 1.454-6.514 51.381-5.616 52.834.8 1.296 17.805 9.766 35.931 17.898C282.583 272.066 298.351 279 299.52 279c1.629 0 32.848-32.375 33.313-34.547.183-.855-3.275-12.669-7.685-26.253-4.409-13.585-9.509-29.425-11.333-35.2l-3.315-10.5-16.246.124c-8.935.068-17.598.395-19.25.725-2.964.593-3.003.545-2.96-3.624.055-5.301 2.307-11.827 4.661-13.505.987-.703 4.623-3.114 8.08-5.356 12.265-7.955 16.934-17.312 18.211-36.496.444-6.672 1.33-13.109 1.97-14.305 2.586-4.831.031-4.201-5.897 1.452-11.689 11.15-21.44 28.376-25.171 44.471-3.461 14.93-5.903 20.509-5.892 13.464.003-2.172.441-6.61.973-9.86 1.286-7.853-.23-18.167-3.736-25.418-3.789-7.836-13.052-16.799-31.473-30.456-8.538-6.33-15.831-12.005-16.206-12.612-.979-1.584-2.252-1.361-2.974.523M171 260.682c-1.375.268-2.882.854-3.35 1.302-.924.887 6.652 26.164 8.892 29.668.756 1.183 12.981 8.332 27.167 15.887 14.185 7.555 33.059 17.72 41.941 22.588l16.151 8.851 5.349-2.325c2.943-1.278 11.75-4.725 19.573-7.659l14.223-5.334 9.592-12.762c5.276-7.019 10.238-13.297 11.027-13.952 2.632-2.185 1.483-3.79-3.815-5.328-7.221-2.095-55.356-13.369-83.25-19.498-12.65-2.779-29.3-6.485-37-8.235-13.989-3.179-21.789-4.122-26.5-3.203m.504 71.312c-.227.367 1.087 2.896 2.921 5.618 2.958 4.392 10.6 17.779 22.909 40.126 2.192 3.981 5.859 9.156 8.147 11.5 6.4 6.555 44.639 29.762 49.04 29.762 2.295 0 25.842-9.216 26.714-10.456.404-.574.741-12.164.75-25.755l.015-24.712-3.75-.978c-11.319-2.952-18.565-4.671-44.377-10.53-15.605-3.542-35.929-8.421-45.165-10.841s-16.977-4.101-17.204-3.734";
const SVG_VIEWBOX = "0 0 500 500";

// ─────────────────────────────────────────────────────────────────────────────
// Canvas-based center crop with zoom
// ─────────────────────────────────────────────────────────────────────────────
const getCroppedImageBlob = async (file: File, type: 'avatar' | 'banner', scale: number): Promise<Blob | null> => {
  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const targetW = type === 'avatar' ? 400 : 1500;
  const targetH = type === 'avatar' ? 400 : 600;

  canvas.width = targetW;
  canvas.height = targetH;

  const scaleFactor = Math.max(targetW / img.width, targetH / img.height) / scale;
  const sw = img.width * scaleFactor;
  const sh = img.height * scaleFactor;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
  return new Promise(resolve => canvas.toBlob(resolve, file.type, 0.92));
};

// ─────────────────────────────────────────────────────────────────────────────
// Styled Components
// ─────────────────────────────────────────────────────────────────────────────
const Banner = styled(Box)(({ theme }) => ({
  height: { xs: 160, sm: 240 },
  background: 'linear-gradient(135deg, var(--color-accent), var(--color-primary))',
  position: 'relative',
  overflow: 'hidden',
  '& img': { width: '100%', height: '100%', objectFit: 'cover' },
}));

const OnlineBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    boxShadow: `0 0 0 3px var(--color-surface)`,
    width: 16,
    height: 16,
    borderRadius: '50%',
  },
}));

const ProfileContainer = styled(Box)(({ theme }) => ({
  maxWidth: 680,
  margin: '0 auto',
  backgroundColor: 'var(--color-surface)',
}));

const CropPreview = styled(Box)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

export const Profile = ({
  userId,
  initialPostId,
  onMessage,
  onSettings
}: {
  userId?: string;
  initialPostId?: string;
  onMessage?: (profile: ProfileType) => void;
  onSettings?: () => void;
}) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const isOwnProfile = targetUserId === user?.id;

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'likes'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [bioLink, setBioLink] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState<ProfileType[]>([]);
  const [followingList, setFollowingList] = useState<ProfileType[]>([]);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);
  const [likedPostIds] = useState<Set<string>>(new Set());

  // Crop states
  const [showAvatarCrop, setShowAvatarCrop] = useState(false);
  const [showBannerCrop, setShowBannerCrop] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [bannerZoom, setBannerZoom] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    if (!targetUserId) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || '');
      setBio(data.bio || '');
      setBioLink(data.bio_link || '');
      setAvatarUrl(data.avatar_url || '');
      setBannerUrl(data.banner_url || '');
    }
  }, [targetUserId]);

  const loadPosts = useCallback(async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });
    setPosts(data || []);
  }, [targetUserId]);

  const loadLikedPosts = async () => {
    if (!targetUserId || isLoadingLikes) return;
    setIsLoadingLikes(true);
    const { data: likes } = await supabase
      .from('likes')
      .select('entity_id')
      .eq('user_id', targetUserId)
      .eq('entity_type', 'post');

    if (likes?.length) {
      const ids = likes.map(l => l.entity_id);
      const { data } = await supabase.from('posts').select('*, profiles(*)').in('id', ids);
      setLikedPosts(data || []);
    }
    setIsLoadingLikes(false);
  };

  const loadFollowStats = async () => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId),
    ]);
    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);
  };

  const checkFollowing = async () => {
    if (!user || isOwnProfile) return;
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();
    setIsFollowing(!!data);
  };

  useEffect(() => {
    loadProfile();
    loadPosts();
    loadFollowStats();
    if (!isOwnProfile) checkFollowing();
  }, [targetUserId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────
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

  const saveProfile = async () => {
    await supabase
      .from('profiles')
      .update({ display_name: displayName, bio, bio_link: bioLink, avatar_url: avatarUrl, banner_url: bannerUrl })
      .eq('id', user!.id);
    setIsEditing(false);
    loadProfile();
  };

  const handleImageSelect = (file: File | null, type: 'avatar' | 'banner') => {
    if (!file) return;
    if (file.type === 'image/gif') {
      uploadMedia(file, 'profiles').then(res => {
        if (res) type === 'avatar' ? setAvatarUrl(res.url) : setBannerUrl(res.url);
      });
      return;
    }
    const url = URL.createObjectURL(file);
    if (type === 'avatar') {
      setAvatarFile(file);
      setAvatarPreview(url);
      setShowAvatarCrop(true);
    } else {
      setBannerFile(file);
      setBannerPreview(url);
      setShowBannerCrop(true);
    }
  };

  const uploadCropped = async (file: File, type: 'avatar' | 'banner') => {
    setIsUploading(true);
    const scale = type === 'avatar' ? avatarZoom : bannerZoom;
    const blob = await getCroppedImageBlob(file, type, scale);
    if (blob) {
      const croppedFile = new File([blob], `cropped-${file.name}`, { type: blob.type });
      const result = await uploadMedia(croppedFile, 'profiles');
      if (result) {
        type === 'avatar' ? setAvatarUrl(result.url) : setBannerUrl(result.url);
      }
    }
    setIsUploading(false);
    setShowAvatarCrop(false);
    setShowBannerCrop(false);
  };

  const mediaPosts = posts.filter(p => p.media_url && ['image', 'video'].includes(p.media_type || ''));

  if (!profile) return (
    <ProfileContainer>
      <Skeleton variant="rectangular" height={240} />
      <Box p={3}>
        <Skeleton variant="circular" width={120} height={120} />
        <Skeleton height={40} width="60%" sx={{ mt: 2 }} />
      </Box>
    </ProfileContainer>
  );

  return (
    <ProfileContainer>
      {/* Banner */}
      <Banner>
        {bannerUrl ? (
          <img src={bannerUrl} alt="Banner" />
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="120" height="120" viewBox={SVG_VIEWBOX}>
              <path d={SVG_PATH} fill="rgba(255,255,255,0.2)" />
            </svg>
          </Box>
        )}
        {isOwnProfile && isEditing && (
          <IconButton onClick={() => bannerInputRef.current?.click()} sx={{ position: 'absolute', bottom: 16, right: 16, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}>
            <CameraIcon />
          </IconButton>
        )}
      </Banner>

      <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: { xs: -6, sm: -8 } }}>
          <OnlineBadge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant={profile.last_seen && (Date.now() - new Date(profile.last_seen).getTime() < 300000) ? 'dot' : undefined}
          >
            <Avatar
              src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
              sx={{ width: { xs: 100, sm: 140 }, height: { xs: 100, sm: 140 }, border: '6px solid var(--color-surface)' }}
            />
          </OnlineBadge>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {isOwnProfile ? (
              <>
                {isEditing ? (
                  <>
                    <Button variant="outlined" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button variant="contained" onClick={saveProfile}>Save</Button>
                  </>
                ) : (
                  <>
                    <Button startIcon={<EditIcon />} variant="outlined" onClick={() => setIsEditing(true)}>Edit Profile</Button>
                    {onSettings && <Button startIcon={<SettingsIcon />} variant="outlined" onClick={onSettings}>Settings</Button>}
                  </>
                )}
              </>
            ) : (
              <>
                <Button startIcon={<MessageIcon />} variant="outlined" onClick={() => onMessage?.(profile)}>Message</Button>
                <Button variant={isFollowing ? 'outlined' : 'contained'} onClick={toggleFollow}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Profile Info */}
        <Box sx={{ mt: 2 }}>
          {isEditing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} fullWidth />
              <TextField label="Bio" value={bio} onChange={e => setBio(e.target.value)} multiline rows={3} fullWidth />
              <TextField label="Link" value={bioLink} onChange={e => setBioLink(e.target.value)} fullWidth InputProps={{ startAdornment: <InputAdornment position="start">https://</InputAdornment> }} />
            </Box>
          ) : (
            <>
              <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {profile.display_name}
                {profile.verified && <BadgeCheck sx={{ color: 'var(--color-accent)' }} />}
              </Typography>
              <Typography color="text.secondary">@{profile.username}</Typography>
              {bio && <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{bio}</Typography>}
              {bioLink && (
                <Button startIcon={<LinkIcon />} href={`https://${bioLink.replace(/^https?:\/\//, '')}`} target="_blank" sx={{ mt: 1 }}>
                  {bioLink.replace(/^https?:\/\//, '').slice(0, 30)}{bioLink.length > 30 ? '...' : ''}
                </Button>
              )}
              <Box sx={{ mt: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Button onClick={() => setShowFollowing(true)}><strong>{followingCount}</strong> Following</Button>
                <Button onClick={() => setShowFollowers(true)}><strong>{followerCount}</strong> Followers</Button>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ bgcolor: 'var(--color-surface)' }}>
        <Tabs value={activeTab} onChange={(_, v) => { setActiveTab(v); if (v === 'likes') loadLikedPosts(); }} centered>
          <Tab icon={<ListIcon />} label="Posts" value="posts" />
          <Tab icon={<GridIcon />} label="Media" value="media" />
          <Tab icon={<LikesIcon />} label="Likes" value="likes" />
        </Tabs>
      </AppBar>

      {/* Tab Content */}
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        {activeTab === 'posts' && posts.map(p => (
          <PostItem key={p.id} post={p} currentUserId={user?.id} isLiked={likedPostIds.has(p.id)} onLikeToggle={() => {}} onCommentUpdate={() => {}} onNavigateToProfile={() => {}} />
        ))}

        {activeTab === 'media' && (
          mediaPosts.length === 0 ? <Typography align="center" color="text.secondary" py={6}>No media yet</Typography> :
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1 }}>
              {mediaPosts.map(p => (
                <Box key={p.id} sx={{ aspectRatio: '1', cursor: 'pointer' }} onClick={() => window.open(p.media_url, '_blank')}>
                  <img src={p.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                </Box>
              ))}
            </Box>
        )}

        {activeTab === 'likes' && (
          isLoadingLikes ? <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} /> :
            likedPosts.length === 0 ? <Typography align="center" py={6} color="text.secondary">No liked posts</Typography> :
              likedPosts.map(p => <PostItem key={p.id} post={p} currentUserId={user?.id} isLiked={true} onLikeToggle={() => {}} onCommentUpdate={() => {}} onNavigateToProfile={() => {}} />)
        )}
      </Box>

      {/* Hidden file inputs */}
      <input type="file" accept="image/*" ref={avatarInputRef} hidden onChange={e => handleImageSelect(e.target.files?.[0] || null, 'avatar')} />
      <input type="file" accept="image/*" ref={bannerInputRef} hidden onChange={e => handleImageSelect(e.target.files?.[0] || null, 'banner')} />

      {/* Avatar Crop Dialog */}
      <Dialog open={showAvatarCrop} onClose={() => !isUploading && setShowAvatarCrop(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crop Avatar</DialogTitle>
        <DialogContent>
          <CropPreview sx={{ height: 400, borderRadius: 4 }}>
            <img src={avatarPreview} style={{ transform: `scale(${avatarZoom})`, maxWidth: '100%', maxHeight: '100%' }} />
            <Box sx={{ position: 'absolute', width: 200, height: 200, border: '3px dashed white', borderRadius: '50%' }} />
          </CropPreview>
          <Slider value={avatarZoom} onChange={(_, v) => setAvatarZoom(v as number)} min={1} max={3} step={0.1} sx={{ mt: 3 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAvatarCrop(false)} disabled={isUploading}>Cancel</Button>
          <Button variant="contained" onClick={() => avatarFile && uploadCropped(avatarFile, 'avatar')} disabled={isUploading}>
            {isUploading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Banner Crop Dialog */}
      <Dialog open={showBannerCrop} onClose={() => !isUploading && setShowBannerCrop(false)} maxWidth="md" fullWidth>
        <DialogTitle>Crop Banner</DialogTitle>
        <DialogContent>
          <CropPreview sx={{ height: 300, borderRadius: 4 }}>
            <img src={bannerPreview} style={{ transform: `scale(${bannerZoom})`, width: '100%' }} />
            <Box sx={{ position: 'absolute', inset: 0, border: '4px dashed white', mx: '10%' }} />
          </CropPreview>
          <Slider value={bannerZoom} onChange={(_, v) => setBannerZoom(v as number)} min={1} max={3} step={0.1} sx={{ mt: 3 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBannerCrop(false)} disabled={isUploading}>Cancel</Button>
          <Button variant="contained" onClick={() => bannerFile && uploadCropped(bannerFile, 'banner')} disabled={isUploading}>
            {isUploading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </ProfileContainer>
  );
};