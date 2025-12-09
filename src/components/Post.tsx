// src/components/Post.tsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase, Post as PostType } from '../lib/supabase';
import { MessageEmbed } from './MessageEmbed';
import { SPECIAL_EVENT_MODE } from '../App';
import { Heart, MessageCircle, MoreVertical, Trash2, FileText, BadgeCheck, Play, Pause, X, Send, Link as LinkIcon, Camera, Share2, Edit3, Check, Repeat } from 'lucide-react';
import {
  Box, Button, IconButton, Typography, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Slider, Tooltip, Avatar, Link, alpha, CircularProgress, LinearProgress
} from '@mui/material';
import {
  HeartBroken as HeartBrokenIcon, PlayArrow as PlayArrowIcon, Pause as PauseIcon,
  Delete as DeleteIcon, Share as ShareIcon, Edit as EditIcon, CheckCircle as CheckCircleIcon,
  Repeat as RepeatIcon, Close as CloseIcon, Message as MessageIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const PostPaper = styled(Paper)(({ theme }) => ({
  borderRadius: 0,
  border: 'none',
  borderBottom: `1px solid var(--color-border)`,
  backgroundColor: 'var(--color-surface)',
  transition: 'background-color 0.2s',
  '&:hover': { backgroundColor: 'var(--color-surface-hover)' },
}));

const AudioRangeInput = styled(Slider)({
  color: 'var(--color-accent)',
  height: 4,
  '& .MuiSlider-thumb': {
    height: 12,
    width: 12,
    backgroundColor: 'var(--color-accent)',
    '&:hover, &.Mui-active': { boxShadow: '0 0 0 8px rgba(var(--color-accent), 0.16)' },
  },
  '& .MuiSlider-rail': { backgroundColor: 'var(--color-border)', opacity: 1 },
});

interface Liker { user_id: string; profiles: any; }
interface Comment { id: string; content: string; user_id: string; created_at: string; profiles: any; }

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
};

const isOnline = (lastSeen?: string | null) => {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 300000;
};

const extractFirstUrl = (text: string) => {
  const match = text.match(/(https?:\/\/[^\s]+)/);
  return match ? match[0] : null;
};

const getYoutubeEmbed = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([\w-]{11})/i);
  if (!match) return null;
  return (
    <Box sx={{ mt: 2, borderRadius: 4, overflow: 'hidden', bgcolor: 'black' }}>
      <iframe
        width="100%"
        height="315"
        src={`https://www.youtube.com/embed/${match[1]}`}
        title="YouTube"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </Box>
  );
};

export const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const formatAudioTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const update = () => { setDuration(audio.duration); setCurrentTime(audio.currentTime); };
    const timeUpdate = () => setCurrentTime(audio.currentTime);
    const toggle = () => setIsPlaying(!audio.paused);
    const ended = () => { setIsPlaying(false); audio.currentTime = 0; };

    audio.addEventListener('loadedmetadata', update);
    audio.addEventListener('timeupdate', timeUpdate);
    audio.addEventListener('play', toggle);
    audio.addEventListener('pause', toggle);
    audio.addEventListener('ended', ended);

    return () => {
      audio.removeEventListener('loadedmetadata', update);
      audio.removeEventListener('timeupdate', timeUpdate);
      audio.removeEventListener('play', toggle);
      audio.removeEventListener('pause', toggle);
      audio.removeEventListener('ended', ended);
    };
  }, []);

  const togglePlay = () => audioRef.current && (audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause());
  const seek = (_: any, value: number | number[]) => {
    const time = Array.isArray(value) ? value[0] : value;
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', p: 1.5, bgcolor: 'var(--color-surface-hover)', borderRadius: 3 }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <IconButton onClick={togglePlay} sx={{ bgcolor: 'var(--color-accent)', color: 'white', '&:hover': { bgcolor: alpha('var(--color-accent)', 0.8) } }}>
        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AudioRangeInput value={currentTime} onChange={seek} min={0} max={duration || 1} step={0.01} />
        <Typography variant="caption" color="text.secondary">
          {formatAudioTime(currentTime)}/{formatAudioTime(duration || 0)}
        </Typography>
      </Box>
    </Box>
  );
};

const EmbeddedPost: React.FC<{ post: PostType; isDeleted?: boolean }> = ({ post, isDeleted }) => {
  if (isDeleted || !post) {
    return (
      <Paper sx={{ p: 2, mt: 2, bgcolor: 'var(--color-surface-hover)', border: `1px solid var(--color-border)`, borderRadius: 3 }}>
        <Typography color="text.secondary" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloseIcon fontSize="small" /> This post is no longer available
        </Typography>
      </Paper>
    );
  }

  const text = post.content?.split('http')[0]?.trim() || post.content || '';
  const hasMedia = !!post.media_url;

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 1.5, borderRadius: 3, cursor: 'pointer', '&:hover': { bgcolor: 'var(--color-surface-hover)' } }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Avatar src={post.profiles?.avatar_url} sx={{ width: 28, height: 28 }} />
        <Typography fontWeight="bold" variant="body2">{post.profiles?.display_name}</Typography>
        <Typography variant="caption" color="text.secondary">@{post.profiles?.username}</Typography>
      </Box>
      {text && <Typography sx={{ mt: 0.5, ml: 5 }}>{text}</Typography>}
      {hasMedia && post.media_type === 'image' && (
        <Box sx={{ mt: 1, ml: 5, borderRadius: 2, overflow: 'hidden', maxHeight: 200 }}>
          <img src={post.media_url} alt="" style={{ width: '100%', display: 'block' }} />
        </Box>
      )}
    </Paper>
  );
};

const Lightbox: React.FC<{ url: string; type: 'image' | 'video'; onClose: () => void }> = ({ url, type, onClose }) => (
  <Dialog open onClose={onClose} fullScreen sx={{ '& .MuiDialog-paper': { bgcolor: 'rgba(0,0,0,0.95)', m: 0 } }}>
    <IconButton onClick={onClose} sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
      <CloseIcon fontSize="large" />
    </IconButton>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', p: 4 }}>
      {type === 'image' ? (
        <img src={url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 24 }} alt="" />
      ) : (
        <video controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 24 }}>
          <source src={url} />
        </video>
      )}
    </Box>
  </Dialog>
);

export interface PostItemProps {
  post: PostType;
  currentUserId?: string;
  isLiked: boolean;
  onLikeToggle: (post: PostType) => void;
  onCommentUpdate: (post: PostType) => void;
  onDelete?: (post: PostType) => void;
  onNavigateToProfile: (userId: string) => void;
}

export const PostItem: React.FC<PostItemProps> = ({
  post,
  currentUserId,
  isLiked,
  onLikeToggle,
  onCommentUpdate,
  onDelete,
  onNavigateToProfile
}) => {
  const isAuthor = currentUserId === post.user_id;

  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxType, setLightboxType] = useState<'image' | 'video'>('image');
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [repostCaption, setRepostCaption] = useState('');
  const [isReposting, setIsReposting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const holdRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLikers = async () => {
    const { data } = await supabase.from('likes').select('user_id, profiles(*)').eq('entity_id', post.id).eq('entity_type', 'post');
    if (data) setLikers(data as any);
  };

  const fetchComments = async () => {
    const { data } = await supabase.from('comments').select('*, profiles(*)').eq('post_id', post.id).order('created_at', { ascending: true });
    if (data) setComments(data as any);
  };

  const handleLikeClick = async () => {
    if (!currentUserId) return;
    onLikeToggle(post);
    if (!isLiked) {
      await supabase.from('likes').insert({ user_id: currentUserId, entity_id: post.id, entity_type: 'post' });
    }
    setShowLikesModal(true);
    fetchLikers();
  };

  const unlikeFromModal = async () => {
    if (!currentUserId) return;
    onLikeToggle(post);
    await supabase.from('likes').delete().match({ user_id: currentUserId, entity_id: post.id, entity_type: 'post' });
    setLikers(prev => prev.filter(l => l.user_id !== currentUserId));
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !newComment.trim()) return;
    const { data } = await supabase.from('comments').insert({ post_id: post.id, user_id: currentUserId, content: newComment.trim() }).select('*, profiles(*)').single();
    if (data) {
      setComments(prev => [...prev, data as any]);
      setNewComment('');
      onCommentUpdate({ ...post, comment_count: (post.comment_count || 0) + 1 });
    }
  };

  const handleRepost = async () => {
    if (!currentUserId) return;
    setIsReposting(true);
    const { error } = await supabase.from('posts').insert({
      user_id: currentUserId,
      content: repostCaption,
      repost_of: post.id,
      is_repost: true,
    });
    if (!error) {
      setShowRepostModal(false);
      setRepostCaption('');
    }
    setIsReposting(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/?post=${post.id}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const startHold = () => {
    setDeleteProgress(0);
    holdRef.current = setInterval(() => {
      setDeleteProgress(p => {
        if (p >= 100) {
          clearInterval(holdRef.current!);
          onDelete?.(post);
          setShowDeleteModal(false);
          return 0;
        }
        return p + 2;
      });
    }, 50);
  };

  const cancelHold = () => {
    if (holdRef.current) clearInterval(holdRef.current);
    setDeleteProgress(0);
  };

  useEffect(() => {
    if (showLikesModal) fetchLikers();
    if (showCommentsModal) fetchComments();
  }, [showLikesModal, showCommentsModal]);

  const openMedia = () => {
    if (!post.media_url) return;
    setLightboxType(post.media_type === 'video' ? 'video' : 'image');
    setShowLightbox(true);
  };

  return (
    <>
      <PostPaper elevation={0}>
        {SPECIAL_EVENT_MODE && <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, #ff0080, #00ff80)', opacity: 0.1, pointerEvents: 'none' }} />}

        <Box sx={{ display: 'flex', gap: 2, p: 2, position: 'relative' }}>
          <Tooltip title="View profile" arrow>
            <IconButton onClick={() => onNavigateToProfile(post.user_id)} sx={{ p: 0 }}>
              <Avatar src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.profiles?.username}`} sx={{ width: 48, height: 48 }} />
              {isOnline(post.profiles?.last_seen) && (
                <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, bgcolor: '#44b700', border: '3px solid var(--color-surface)', borderRadius: '50%' }} />
              )}
            </IconButton>
          </Tooltip>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography fontWeight="bold" component="span" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => onNavigateToProfile(post.user_id)}>
                {post.profiles?.display_name}
              </Typography>
              {post.profiles?.verified && <BadgeCheck size={18} style={{ color: 'var(--color-accent)' }} />}
              <Typography color="text.secondary" variant="body2">@{post.profiles?.username} · {formatTime(post.created_at)}</Typography>
            </Box>

            {isEditing ? (
              <Box sx={{ mt: 2 }}>
                <TextField fullWidth multiline rows={4} value={editContent} onChange={e => setEditContent(e.target.value)} variant="outlined" />
                <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button onClick={() => { setIsEditing(false); setEditContent(post.content); }}>Cancel</Button>
                  <Button variant="contained" onClick={async () => {
                    await supabase.from('posts').update({ content: editContent }).eq('id', post.id);
                    setIsEditing(false);
                  }}>Save</Button>
                </Box>
              </Box>
            ) : (
              <>
                <Typography sx={{ mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {post.content.split('http')[0]}
                </Typography>
                {extractFirstUrl(post.content) && (getYoutubeEmbed(extractFirstUrl(post.content)!) || <MessageEmbed url={extractFirstUrl(post.content)!} />)}
                {post.is_repost && <EmbeddedPost post={post.original_post as any} isDeleted={!post.original_post} />}
              </>
            )}

            {post.media_url && post.media_type === 'image' && (
              <Box mt={2} sx={{ borderRadius: 4, overflow: 'hidden', cursor: 'pointer' }} onClick={openMedia}>
                <img src={post.media_url} style={{ width: '100%', borderRadius: 16 }} alt="" />
              </Box>
            )}
            {post.media_url && post.media_type === 'video' && (
              <Box mt={2} sx={{ position: 'relative', borderRadius: 4, overflow: 'hidden', cursor: 'pointer' }} onClick={openMedia}>
                <video src={post.media_url} style={{ width: '100%', borderRadius: 16 }} />
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.3)' }}>
                  <PlayArrowIcon sx={{ fontSize: 64, color: 'white' }} />
                </Box>
              </Box>
            )}
            {post.media_url && post.media_type === 'audio' && <AudioPlayer src={post.media_url} />}

            <Box sx={{ mt: 2, display: 'flex', gap: 4, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton onClick={handleLikeClick} sx={{ color: isLiked ? '#f44336' : 'inherit' }}>
                  <Heart size={20} fill={isLiked ? '#f44336' : 'none'} />
                </IconButton>
                {post.like_count > 0 && <Typography variant="body2" color="text.secondary">{post.like_count}</Typography>}
              </Box>
              <IconButton onClick={() => setShowCommentsModal(true)}>
                <MessageCircle size={20} />
              </IconButton>
              <IconButton onClick={() => setShowRepostModal(true)}>
                <Repeat size={20} />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ position: 'relative' }}>
            <IconButton onClick={() => setShowMenu(v => !v)}>
              {shareCopied ? <CheckCircleIcon color="success" /> : <MoreVertical size={20} />}
            </IconButton>
            {showMenu && (
              <>
                <Box sx={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowMenu(false)} />
                <Paper sx={{ position: 'absolute', right: 0, top: 40, width: 200, zIndex: 20 }}>
                  <Button fullWidth sx={{ justifyContent: 'flex-start', py: 1.5 }} startIcon={<ShareIcon />} onClick={handleShare}>Share</Button>
                  {isAuthor && (
                    <>
                      <Button fullWidth sx={{ justifyContent: 'flex-start', py: 1.5 }} startIcon={<EditIcon />} onClick={() => { setIsEditing(true); setShowMenu(false); }}>Edit</Button>
                      <Button fullWidth sx={{ justifyContent: 'flex-start', py: 1.5, color: 'error.main' }} startIcon={<DeleteIcon />} onClick={() => { setShowDeleteModal(true); setShowMenu(false); }}>Delete</Button>
                    </>
                  )}
                </Paper>
              </>
            )}
          </Box>
        </Box>
      </PostPaper>

      {showLightbox && post.media_url && <Lightbox url={post.media_url} type={lightboxType} onClose={() => setShowLightbox(false)} />}

      <Dialog open={showLikesModal} onClose={() => setShowLikesModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Likes</DialogTitle>
        <DialogContent dividers>
          {likers.length === 0 ? <Typography align="center" color="text.secondary">No likes yet</Typography> : likers.map(l => (
            <Box key={l.user_id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => onNavigateToProfile(l.user_id)}>
                <Avatar src={l.profiles?.avatar_url} />
                <Box>
                  <Typography fontWeight="bold">{l.profiles?.display_name}</Typography>
                  <Typography variant="body2" color="text.secondary">@{l.profiles?.username}</Typography>
                </Box>
              </Box>
              {l.user_id === currentUserId && <IconButton onClick={unlikeFromModal}><HeartBrokenIcon color="error" /></IconButton>}
            </Box>
          ))}
        </DialogContent>
      </Dialog>

      <Dialog open={showCommentsModal} onClose={() => setShowCommentsModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Comments ({comments.length})</DialogTitle>
        <DialogContent dividers sx={{ minHeight: 300 }}>
          {comments.map(c => (
            <Box key={c.id} sx={{ display: 'flex', gap: 1.5, py: 1 }}>
              <Avatar src={c.profiles?.avatar_url} sx={{ width: 36, height: 36 }} />
              <Box>
                <Typography fontWeight="bold">{c.profiles?.display_name}</Typography>
                <Paper sx={{ p: 1.5, bgcolor: 'var(--color-surface-hover)', borderRadius: '0 12px 12px 12px', mt: 0.5 }}>
                  <Typography>{c.content}</Typography>
                </Paper>
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Box component="form" onSubmit={handlePostComment} sx={{ flexGrow: 1, px: 2, pb: 2 }}>
            <TextField fullWidth placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} variant="outlined" size="small"
              InputProps={{ endAdornment: <IconButton type="submit"><Send /></IconButton> }}
            />
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog open={showDeleteModal} onClose={() => { setShowDeleteModal(false); cancelHold(); }}>
        <DialogTitle>Delete Post?</DialogTitle>
        <DialogContent>
          <Button fullWidth variant="contained" color="error" size="large"
            onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold}
            onTouchStart={startHold} onTouchEnd={cancelHold}
            sx={{ position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'error.dark', width: `${deleteProgress}%`, transition: 'width 0.05s' }} />
            <span style={{ position: 'relative', zIndex: 1 }}>
              {deleteProgress > 0 ? `Hold (${deleteProgress}%)` : 'Hold to Delete'}
            </span>
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showRepostModal} onClose={() => setShowRepostModal(false)}>
        <DialogTitle>Repost</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={3} placeholder="Add a comment (optional)" value={repostCaption} onChange={e => setRepostCaption(e.target.value)} />
          <Box sx={{ mt: 2, pointerEvents: 'none', opacity: 0.7 }}>
            <EmbeddedPost post={post} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRepost} disabled={isReposting} variant="contained">
            {isReposting ? <CircularProgress size={20} /> : 'Repost'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};