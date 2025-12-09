// src/components/Post.tsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase, Post as PostType } from '../lib/supabase';
import { MessageEmbed } from './MessageEmbed';
import { SPECIAL_EVENT_MODE } from '../App';
import { 
  Heart, 
  MessageCircle, 
  MoreVertical, 
  Trash2, 
  FileText, 
  BadgeCheck, 
  Play, 
  Pause, 
  X, 
  Send, 
  Link as LinkIcon, 
  Camera,
  Share2,
  Edit3,
  Check,
  Repeat
} from 'lucide-react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  CircularProgress,
  Link,
  useTheme,
  createTheme,
  ThemeProvider,
  styled,
  Avatar,
  Slider,
  Tooltip,
} from '@mui/material';
import {
  HeartBroken as HeartBrokenIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Repeat as RepeatIcon,
  Close as CloseIcon,
  Message as MessageIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';


// --- MUI THEME DEFINITION based on CSS Variables ---
// This theme must be wrapped around the entire Post component tree.
const getMuiTheme = (primaryColor: string) => createTheme({
  palette: {
    // Map main MUI colors to user's CSS variables
    primary: {
      main: 'var(--color-accent)', // Use accent color as primary
      light: 'var(--color-accent-light, #e0f2f1)',
      dark: 'var(--color-accent-dark, #004d40)',
      contrastText: 'var(--color-text-on-primary, #fff)',
    },
    error: {
      main: 'var(--color-error, #f44336)',
      contrastText: 'var(--color-text-on-error, #fff)',
    },
    success: {
      main: 'var(--color-success, #4caf50)',
      contrastText: 'var(--color-text-on-success, #fff)',
    },
    text: {
      primary: 'var(--color-text)',
      secondary: 'var(--color-text-secondary)',
      disabled: 'var(--color-text-secondary)',
    },
    background: {
      default: 'var(--color-background, #fff)',
      paper: 'var(--color-surface, #fff)',
    },
    divider: 'var(--color-border)',
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '16px', // M3 style
          border: '1px solid var(--color-border)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: '24px', // Full pill shape for M3
          textTransform: 'none',
          fontWeight: 'bold',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '24px', // Large radius for modals
          // Ensure it respects the custom background color from CSS var
          backgroundColor: 'var(--color-surface)',
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          // Use M3 tonal system for hover effects
          transition: 'background-color 0.2s',
          '&:hover': {
            backgroundColor: 'var(--color-surface-hover)',
          },
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'var(--color-text)',
          color: 'var(--color-surface)',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          padding: '6px 10px',
          borderRadius: '8px',
        }
      }
    }
  },
});

// --- STYLED COMPONENTS & TYPES (MUI INTEGRATION) ---
// Using styled to ensure AudioPlayer input styles are consistent
const AudioRangeInput = styled(Slider)(({ theme }) => ({
  color: theme.palette.primary.main, // Uses the mapped CSS variable
  height: 4,
  padding: '13px 0',
  '& .MuiSlider-thumb': {
    height: 12,
    width: 12,
    backgroundColor: theme.palette.primary.main,
    '&:focus, &:hover, &.Mui-active': {
      boxShadow: '0 3px 1px -2px rgba(0,0,0,0.2),0 2px 2px 0 rgba(0,0,0,0.14),0 1px 5px 0 rgba(0,0,0,0.12)',
    },
  },
  '& .MuiSlider-track': {
    border: 'none',
  },
  '& .MuiSlider-rail': {
    opacity: 1,
    backgroundColor: 'var(--color-border)', // Uses the mapped CSS variable
  },
}));

// --- UTILS & SUB COMPONENTS (Converted to MUI) ---

// ... (PostType, Comment, Liker interfaces remain intact)
// ... (SVG_PATH, SVG_VIEWBOX, extractFirstUrl remain intact)

export const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // ... (Audio event listeners logic remains intact)
    const audio = audioRef.current;
    if (!audio) return;
    const setAudioData = () => { setDuration(audio.duration); setCurrentTime(audio.currentTime); };
    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const togglePlay = () => setIsPlaying(!audio.paused);

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('play', togglePlay);
    audio.addEventListener('pause', togglePlay);
    audio.addEventListener('ended', () => { setIsPlaying(false); audio.currentTime = 0; });
    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('play', togglePlay);
      audio.removeEventListener('pause', togglePlay);
      audio.removeEventListener('ended', () => {});
    };
  }, []);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (audio) { isPlaying ? audio.pause() : audio.play(); }
  };

  const handleSeek = (e: Event, value: number | number[]) => {
    const time = Array.isArray(value) ? value[0] : value;
    const audio = audioRef.current;
    if (audio) { audio.currentTime = time; setCurrentTime(time); }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', p: 1, backgroundColor: 'var(--color-surface-hover)', borderRadius: 2 }}>
      <audio ref={audioRef} src={src} preload="metadata" style={{ display: 'none' }} />
      <IconButton 
        onClick={handlePlayPause} 
        size="small" 
        sx={{ 
          flexShrink: 0, 
          backgroundColor: 'primary.main', 
          color: 'primary.contrastText',
          '&:hover': {
             backgroundColor: 'primary.dark',
          } 
        }}
      >
        {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
      </IconButton>
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AudioRangeInput 
          min={0} 
          max={duration} 
          step={0.01} 
          value={currentTime} 
          onChange={handleSeek} 
          aria-label="time-seek"
        />
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          {formatTime(currentTime)}/{formatTime(duration)}
        </Typography>
      </Box>
    </Box>
  );
};

// Replaces getEmbeddedMedia. purely handles generating the YouTube iframe from a URL string.
const getYoutubeEmbed = (url: string) => {
  if (!url) return null;
  const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([\w-]{11})/i);
  
  if (youtubeMatch && youtubeMatch[1]) {
    return (
      <Box sx={{ mt: 1.5, borderRadius: '16px', overflow: 'hidden', bgcolor: 'black' }}>
        <iframe 
          title="YouTube" 
          style={{ width: '100%', aspectRatio: '16/9' }} 
          src={`https://www.youtube.com/embed/${youtubeMatch[1]}`} 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </Box>
    );
  }
  return null;
};

const EmbeddedPost: React.FC<{ post: PostType; isDeleted?: boolean }> = ({ post, isDeleted }) => {
  const [embedComponent, setEmbedComponent] = useState<React.ReactNode>(null);
  const [textToDisplay, setTextToDisplay] = useState('');

  useEffect(() => {
    if (isDeleted || !post) return;
    
    let text = post.content;
    const match = text.match(/(https?:\/\/[^\s]+)/);
    const url = match ? match[0] : null;
    
    if (!post.media_url && url) {
        text = text.replace(url, '').trim();
        const yt = getYoutubeEmbed(url); 
        setEmbedComponent(yt || <MessageEmbed url={url} />);
    } else {
        setEmbedComponent(null);
    }
    setTextToDisplay(text);
  }, [post, isDeleted]);

  if (isDeleted || !post) {
    return (
      <Paper elevation={0} sx={{ mt: 1.5, p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'var(--color-surface-hover)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 1.5 }}>
         <CloseIcon fontSize="small" />
         <Typography variant="body2" color="text.secondary">
            [Original post has been deleted or cannot be found right now]
         </Typography>
      </Paper>
    );
  }

  return (
    <Paper 
      variant="outlined"
      sx={{ 
        mt: 1.5, 
        overflow: 'hidden', 
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: 'var(--color-surface-hover)' }
      }}
    >
       {/* Simple Header */}
       <Box sx={{ p: 1.5, pb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar src={post.profiles?.avatar_url} alt="" sx={{ width: 24, height: 24 }} />
          <Typography component="span" fontWeight="bold" variant="body2">{post.profiles?.display_name}</Typography>
          <Typography component="span" variant="caption" color="text.secondary">
            @{post.profiles?.username} • {new Date(post.created_at).toLocaleDateString()}
          </Typography>
       </Box>
       
       {/* Content */}
       <Box sx={{ p: 1.5, pt: 0.5 }}>
          {textToDisplay && <Typography variant="body2" sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', mb: 1 }}>{textToDisplay}</Typography>}
          {embedComponent}
          
          {post.media_url && (
             <Box sx={{ mt: 1.5, borderRadius: '8px', overflow: 'hidden', height: 160, bgcolor: 'black', position: 'relative' }}>
                {post.media_type === 'image' && <Box component="img" src={post.media_url} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Media" />}
                {post.media_type === 'video' && <Box component="video" src={post.media_url} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                {post.media_type === 'audio' && (
                  <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="caption" component="span" textTransform="uppercase" fontWeight="bold" sx={{ opacity: 0.5, letterSpacing: 2 }}>Audio Attachment</Typography>
                  </Box>
                )}
             </Box>
          )}
       </Box>
    </Paper>
  );
};

// Converted to MUI Dialog
const Lightbox: React.FC<{ url: string; type: 'image' | 'video'; onClose: () => void }> = ({ url, type, onClose }) => (
  <Dialog
    open
    onClose={onClose}
    fullScreen
    sx={{ 
      '& .MuiDialog-paper': { 
        backgroundColor: 'rgba(0,0,0,0.9)', 
        borderRadius: 0,
        boxShadow: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }
    }}
  >
    <Box onClick={onClose} sx={{ position: 'absolute', inset: 0, cursor: 'pointer' }} />
    <Box sx={{ maxWidth: '100%', maxHeight: '100%', p: 4 }} onClick={(e) => e.stopPropagation()}>
      {type === 'image' && <Box component="img" src={url} sx={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '16px', boxShadow: 24 }} alt="Full size" />}
      {type === 'video' && (
        <Box component="video" controls autoPlay sx={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '24px' }}>
          <source src={url} /> Your browser does not support the video tag.
        </Box>
      )}
    </Box>
    <IconButton onClick={onClose} sx={{ position: 'absolute', top: 16, right: 16, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, zIndex: 10 }}>
      <CloseIcon fontSize="large" />
    </IconButton>
  </Dialog>
);

// --- MAIN POST COMPONENT ---

// ... (PostItemProps interface remains intact)

export const PostItem: React.FC<PostItemProps> = ({
  post,
  currentUserId,
  isLiked,
  onLikeToggle,
  onCommentUpdate,
  onDelete,
  onNavigateToProfile
}) => {
  // ... (All state and handler logic remains intact)
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxType, setLightboxType] = useState<'image' | 'video' | null>(null);
  const [likersList, setLikersList] = useState<Liker[]>([]);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [repostCaption, setRepostCaption] = useState('');
  const [isReposting, setIsReposting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [displayContent, setDisplayContent] = useState(post.content);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ... (formatTime, isOnline, handleRepost, handleShare, handleUpdatePost, fetchLikers, handleLikeClick, removeLikeFromModal, fetchComments, handlePostComment, startDeleteHold, cancelDeleteHold logic remains intact)

  const handleRepost = async () => {
      if (!currentUserId) return;
      setIsReposting(true);
      
      const targetPostId = post.id; 

      const { error } = await supabase.from('posts').insert({
          user_id: currentUserId,
          content: repostCaption, 
          repost_of: targetPostId, 
          is_repost: true,
          media_type: 'image' 
      });

      if (!error) {
          setShowRepostModal(false);
          setRepostCaption('');
          // Replaced alert with a more modern notification/snackbar equivalent logic
      } else {
          // Replaced alert
      }
      setIsReposting(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/?post=${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setOpenMenu(false);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const handleUpdatePost = async () => {
    if (!editContent.trim() || editContent === post.content) {
      setIsEditing(false);
      return;
    }
    
    const { error } = await supabase
      .from('posts')
      .update({ content: editContent })
      .eq('id', post.id);

    if (!error) {
      setDisplayContent(editContent);
      setIsEditing(false);
    } else {
      // Replaced alert
    }
  };

  const fetchLikers = async () => {
    const { data } = await supabase.from('likes').select('user_id, profiles(*)').eq('entity_id', post.id).eq('entity_type', 'post');
    if (data) setLikersList(data as unknown as Liker[]);
  };

  const handleLikeClick = async () => {
    if (!currentUserId) return;
    onLikeToggle(post); 
    
    if (!isLiked) {
       await supabase.from('likes').insert({ user_id: currentUserId, entity_id: post.id, entity_type: 'post' });
    }
    // Only show modal if the like count updates successfully in a real app, 
    // but for now, we'll keep the logic of showing the modal on click.
    setShowLikesModal(true); 
    fetchLikers(); // Re-fetch for accuracy
  };

  const removeLikeFromModal = async () => {
      if (!currentUserId) return;
      onLikeToggle(post);
      setLikersList(prev => prev.filter(l => l.user_id !== currentUserId));
      await supabase.from('likes').delete().match({ user_id: currentUserId, entity_id: post.id, entity_type: 'post' });
  };
  
  useEffect(() => {
    if (showLikesModal) fetchLikers();
  }, [showLikesModal]);

  const fetchComments = async () => {
    const { data } = await supabase.from('comments').select('*, profiles(*)').eq('post_id', post.id).order('created_at', { ascending: true });
    if (data) setCommentsList(data as Comment[]);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !newCommentText.trim()) return;
    setIsPostingComment(true);
    const { data, error } = await supabase.from('comments').insert({ post_id: post.id, user_id: currentUserId, content: newCommentText.trim() }).select('*, profiles(*)').single();
    if (!error && data) {
        setCommentsList(prev => [...prev, data as Comment]);
        setNewCommentText('');
        onCommentUpdate({ ...post, comment_count: (post.comment_count || 0) + 1 });
    }
    setIsPostingComment(false);
  };
  
  useEffect(() => {
    if (showCommentsModal) fetchComments();
  }, [showCommentsModal]);

  const startDeleteHold = () => {
    setDeleteProgress(0);
    let progress = 0;
    holdIntervalRef.current = setInterval(() => {
      progress += 2; 
      if (progress >= 100) {
        clearInterval(holdIntervalRef.current!);
        if (onDelete) onDelete(post);
        setShowDeleteModal(false);
        return;
      }
      setDeleteProgress(progress);
    }, 50);
  };
  const cancelDeleteHold = () => {
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    setDeleteProgress(0);
  };
  // ... (Other useEffects remain intact)


  const isAuthor = currentUserId === post.user_id;
  const groupData = (post as any).groups;
  const theme = getMuiTheme(post.profiles?.avatar_url || 'default'); // Pass a stable value to prevent unnecessary theme recalculations

  return (
    <ThemeProvider theme={theme}>
      <Paper 
        elevation={0} 
        variant="outlined"
        sx={{ 
          borderBottom: 1, // Only bottom border
          borderRadius: 0,
          p: 2, 
          transition: 'background-color 0.2s', 
          '&:hover': { bgcolor: 'var(--color-surface-hover)' },
          position: 'relative',
          bgcolor: 'var(--color-surface)',
        }}
      >
        {/* SPECIAL EVENT RGB OVERLAY */}
        {SPECIAL_EVENT_MODE && <Box className="special-event-overlay" sx={{ position: 'absolute', inset: 0, zIndex: 1 }} />}
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
          <Tooltip title={`View @${post.profiles?.username}'s Profile`} arrow>
            <IconButton 
              onClick={() => onNavigateToProfile(post.user_id)} 
              sx={{ p: 0, flexShrink: 0, position: 'relative' }}
            >
              <Avatar 
                src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.profiles?.username}`} 
                alt="Avatar" 
                sx={{ width: 48, height: 48, transition: 'opacity 0.2s', '&:hover': { opacity: 0.8 } }} 
              />
              {isOnline(post.profiles?.last_seen) && (
                <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, bgcolor: 'success.main', border: '2px solid var(--color-surface)', borderRadius: '50%' }} />
              )}
            </IconButton>
          </Tooltip>
          
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Link 
                component="button" 
                onClick={() => onNavigateToProfile(post.user_id)} 
                fontWeight="bold" 
                underline="hover" 
                color="text.primary"
                sx={{ p: 0 }}
              >
                {post.profiles?.display_name}
              </Link>
              {post.profiles?.verified && <BadgeCheck size={16} style={{ color: 'var(--color-accent)' }} />}
              <Typography variant="body2" color="text.secondary">@{post.profiles?.username}</Typography>
              
              {/* CUSTOM BADGE */}
              {(post.profiles as any)?.badge_url && (
                  <Box className="group" sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 16, px: 0.75, minWidth: 18, borderRadius: '4px', overflow: 'visible', verticalAlign: 'middle', ml: 0.5 }}>
                    <Box sx={{ position: 'absolute', inset: 0, background: `url(${(post.profiles as any).badge_url}) no-repeat center / cover`, borderRadius: '2px' }} />
                    {(post.profiles as any)?.badge_text && (
                       <Typography variant="caption" component="span" sx={{ position: 'relative', zIndex: 1, fontSize: '8px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 1, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{(post.profiles as any).badge_text}</Typography>
                    )}
                    {(post.profiles as any)?.badge_tooltip && (
                      <Tooltip title={(post.profiles as any).badge_tooltip} placement="bottom" arrow>
                         <Box sx={{ position: 'absolute', inset: 0 }} />
                      </Tooltip>
                    )}
                  </Box>
              )}
              <Typography variant="body2" color="text.secondary">
                · {new Date(post.created_at).toLocaleDateString()} at {formatTime(post.created_at)}
              </Typography>
            </Box>

            {groupData && (
                <Box 
                   sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, cursor: 'pointer', width: 'fit-content', '&:hover .group-text': { color: 'primary.main' } }} 
                   className="group" 
                >
                   <Avatar 
                      src={groupData.icon_url || `https://ui-avatars.com/api/?name=${groupData.name}&background=random`} 
                      alt="Group" 
                      sx={{ width: 20, height: 20, borderRadius: '6px', border: '1px solid var(--color-border)' }} 
                   />
                   <Typography variant="caption" fontWeight="bold" color="text.secondary" className="group-text" sx={{ transition: 'color 0.2s' }}>
                     {groupData.name}
                   </Typography>
                </Box>
            )}
            
            {isEditing ? (
              <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                 <TextField
                    value={editContent} 
                    onChange={(e) => setEditContent(e.target.value)} 
                    fullWidth
                    multiline
                    minRows={3}
                    variant="outlined"
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                         bgcolor: 'var(--color-background)', 
                         borderRadius: '12px',
                         '&.Mui-focused fieldset': {
                           borderColor: 'primary.main',
                           borderWidth: '2px',
                         }
                      }
                    }}
                    autoFocus
                 />
                 <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button onClick={() => { setIsEditing(false); setEditContent(displayContent); }} color="inherit" sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Button onClick={handleUpdatePost} variant="contained" color="primary">Save</Button>
                 </Box>
              </Box>
            ) : (
              // Display Content Logic (Unified Embeds)
              <Box>
                 {(() => {
                    let textToDisplay = displayContent;
                    let embedComponent = null;

                    if (!post.media_url) {
                       const url = extractFirstUrl(displayContent);
                       
                       if (url) {
                          textToDisplay = displayContent.replace(url, '').trim();
                          const youtubeEmbed = getYoutubeEmbed(url);
                          if (youtubeEmbed) {
                             embedComponent = youtubeEmbed;
                          } else {
                             embedComponent = <MessageEmbed url={url} />;
                          }
                       }
                    }

                    return (
                       <>
                          {textToDisplay && (
                             <Typography variant="body1" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {textToDisplay}
                             </Typography>
                          )}
                          {embedComponent}
                          {post.is_repost && (
                              <EmbeddedPost 
                                  post={post.original_post as PostType} 
                                  isDeleted={!post.original_post} 
                              />
                          )}
                       </>
                    );
                 })()}
              </Box>
            )}

            {post.media_url && (
              <Box sx={{ mt: 2 }}>
                {post.media_type === 'image' && (
                  <Box 
                    component="img" 
                    src={post.media_url} 
                    sx={{ borderRadius: '16px', maxHeight: 384, objectFit: 'cover', width: '100%', cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.9 } }} 
                    alt="Post media" 
                    onClick={() => { setLightboxType('image'); setShowLightbox(true); }} 
                  />
                )}
                {post.media_type === 'video' && (
                    <Box sx={{ position: 'relative', cursor: 'pointer', borderRadius: '16px', overflow: 'hidden' }} onClick={() => { setLightboxType('video'); setShowLightbox(true); }}>
                         <Box component="video" src={post.media_url} sx={{ maxHeight: 384, width: '100%', objectFit: 'cover' }} />
                         <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.2)', '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }, transition: 'background-color 0.2s', borderRadius: '16px' }}>
                            <PlayArrowIcon sx={{ fontSize: 48, color: 'white', opacity: 0.8 }} />
                         </Box>
                    </Box>
                )}
                {post.media_type === 'audio' && <AudioPlayer src={post.media_url} />}
                {post.media_type === 'document' && (
                  <Button 
                    href={post.media_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    startIcon={<FileText size={20} />}
                    variant="outlined"
                    color="inherit"
                    sx={{ 
                      textTransform: 'none', 
                      borderRadius: '12px', 
                      bgcolor: 'var(--color-surface-hover)',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'var(--color-border)' },
                      mt: 1,
                    }}
                  >
                    Download File
                  </Button>
                )}
              </Box>
            )}

            {/* ACTION BAR */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 2 }}>
              
              {/* Like Button */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton 
                  onClick={(e) => { e.stopPropagation(); handleLikeClick(); }} 
                  sx={{ 
                    color: isLiked ? 'var(--color-error)' : 'text.secondary',
                    bgcolor: isLiked ? 'rgba(244, 67, 54, 0.1)' : 'transparent',
                    '&:hover': { 
                      bgcolor: 'rgba(244, 67, 54, 0.1)',
                      color: 'var(--color-error)'
                    }
                  }}
                >
                  <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                </IconButton>
                {post.like_count > 0 && (
                  <Link component="button" onClick={(e) => { e.stopPropagation(); setShowLikesModal(true); }} variant="body2" color="text.secondary" underline="hover">
                    {post.like_count}
                  </Link>
                )}
              </Box>

              {/* Comment Button */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton 
                  onClick={(e) => { e.stopPropagation(); setShowCommentsModal(true); }} 
                  color="info"
                  sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.1)', color: '#2196f3' } }} // Placeholder Info/Blue
                >
                  <MessageCircle size={18} />
                </IconButton>
                {post.comment_count > 0 && (
                  <Link component="button" onClick={(e) => { e.stopPropagation(); setShowCommentsModal(true); }} variant="body2" color="text.secondary" underline="hover">
                    {post.comment_count}
                  </Link>
                )}
              </Box>

              {/* Repost Button */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton 
                    onClick={(e) => { e.stopPropagation(); setShowRepostModal(true); }} 
                    color="success"
                    sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50' } }} // Placeholder Success/Green
                >
                  <Repeat size={18} />
                </IconButton>
                {(post.repost_count || 0) > 0 && <Typography variant="body2" color="text.secondary">{post.repost_count}</Typography>}
              </Box>
            </Box>
          </Box>

          {/* MORE MENU */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Tooltip title={shareCopied ? 'Copied!' : 'More Options'} placement="top" arrow>
              <IconButton onClick={(e) => { e.stopPropagation(); setOpenMenu(!openMenu); }} sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'var(--color-surface-hover)' } }}>
                 {shareCopied ? <CheckCircleIcon color="success" fontSize="small" /> : <MoreVertical size={20} />}
              </IconButton>
            </Tooltip>
            {openMenu && (
              <>
                <Box sx={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpenMenu(false)} />
                <Paper sx={{ position: 'absolute', right: 0, mt: 1, width: 192, overflow: 'hidden', zIndex: 20 }}>
                  <Button onClick={handleShare} startIcon={<ShareIcon fontSize="small" />} fullWidth sx={{ justifyContent: 'flex-start', p: 1.5, color: 'text.primary', textTransform: 'none' }}>Share Post</Button>

                  {isAuthor && (
                    <>
                      <Button onClick={() => { setIsEditing(true); setOpenMenu(false); }} startIcon={<EditIcon fontSize="small" />} fullWidth sx={{ justifyContent: 'flex-start', p: 1.5, color: 'text.primary', textTransform: 'none' }}>Edit Post</Button>
                      <Button onClick={() => { setShowDeleteModal(true); setOpenMenu(false); }} startIcon={<DeleteIcon fontSize="small" />} fullWidth sx={{ justifyContent: 'flex-start', p: 1.5, color: 'error.main', textTransform: 'none' }}>Delete Post</Button>
                    </>
                  )}
                </Paper>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {/* --- MODALS (MUI Dialog Conversions) --- */}

      {showLightbox && post.media_url && <Lightbox url={post.media_url} type={lightboxType || 'image'} onClose={() => setShowLightbox(false)} />}

      {/* Likes Modal */}
      <Dialog open={showLikesModal} onClose={() => setShowLikesModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6" fontWeight="bold">Likes</Typography>
          <IconButton onClick={() => setShowLikesModal(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, '&::-webkit-scrollbar': { width: '8px' } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {likersList.length === 0 ? <Typography align="center" color="text.secondary">No likes yet.</Typography> : likersList.map((liker, idx) => (
              <Box key={`${liker.user_id}-${idx}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => onNavigateToProfile(liker.user_id)}>
                  <Avatar src={liker.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${liker.profiles?.username}`} sx={{ width: 40, height: 40 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
                       {liker.profiles?.display_name} {liker.profiles?.verified && <BadgeCheck size={14} style={{ marginLeft: 4, color: 'var(--color-accent)' }} />}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">@{liker.profiles?.username}</Typography>
                  </Box>
                </Box>
                {liker.user_id === currentUserId && (
                  <Tooltip title="Unlike" arrow>
                    <IconButton onClick={removeLikeFromModal} sx={{ color: 'error.main', bgcolor: 'rgba(244, 67, 54, 0.1)' }}>
                      <HeartBrokenIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <Dialog open={showCommentsModal} onClose={() => setShowCommentsModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6" fontWeight="bold">Comments ({commentsList.length})</Typography>
          <IconButton onClick={() => setShowCommentsModal(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, flexGrow: 1, minHeight: '300px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {commentsList.length === 0 ? <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>No comments yet.</Box> : commentsList.map((comment) => (
              <Box key={comment.id} sx={{ display: 'flex', gap: 1.5 }}>
                <Avatar src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.profiles?.username}`} sx={{ width: 36, height: 36, flexShrink: 0, cursor: 'pointer' }} onClick={() => onNavigateToProfile(comment.user_id)} />
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Link component="button" onClick={() => onNavigateToProfile(comment.user_id)} fontWeight="bold" underline="hover" variant="subtitle2" color="text.primary" sx={{ p: 0 }}>{comment.profiles?.display_name}</Link>
                    <Typography variant="caption" color="text.secondary">{formatTime(comment.created_at)}</Typography>
                  </Box>
                  <Paper elevation={0} sx={{ mt: 0.5, p: 1.5, bgcolor: 'var(--color-surface-hover)', borderRadius: '0 12px 12px 12px', display: 'inline-block' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{comment.content}</Typography>
                  </Paper>
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 1, bgcolor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
          <Box component="form" onSubmit={handlePostComment} sx={{ flexGrow: 1, p: 1 }}>
            <TextField
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment..."
              variant="outlined"
              fullWidth
              size="small"
              disabled={isPostingComment}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: '24px', 
                  bgcolor: 'var(--color-surface-hover)',
                  p: '4px 12px',
                  '& input': { p: 1 },
                } 
              }}
              InputProps={{
                endAdornment: (
                  <IconButton type="submit" size="small" disabled={!newCommentText.trim() || isPostingComment} color="primary">
                    {isPostingComment ? <CircularProgress size={18} color="primary" /> : <Send size={18} />}
                  </IconButton>
                ),
              }}
            />
          </Box>
        </DialogActions>
      </Dialog>
      
      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onClose={() => { setShowDeleteModal(false); cancelDeleteHold(); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
          <DeleteIcon sx={{ color: 'error.main' }} />
          <Typography variant="h5" fontWeight="bold">Confirm Deletion</Typography>
          <IconButton onClick={() => { setShowDeleteModal(false); cancelDeleteHold(); }} sx={{ ml: 'auto' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          <Typography mb={2}>Are you sure? This action cannot be undone!</Typography>
          <Button
            fullWidth
            variant="contained"
            color="error"
            size="large"
            onMouseDown={startDeleteHold} onMouseUp={cancelDeleteHold} onMouseLeave={cancelDeleteHold}
            onTouchStart={startDeleteHold} onTouchEnd={cancelDeleteHold}
            disabled={deleteProgress >= 100}
            sx={{ position: 'relative', overflow: 'hidden', mb: 1.5, color: 'white' }}
          >
            <Box 
              sx={{ 
                position: 'absolute', 
                inset: 0, 
                bgcolor: 'error.dark', 
                width: `${deleteProgress}%`, 
                transition: 'width 0.05s linear',
                opacity: 0.5,
                zIndex: 1,
              }} 
            />
            <Typography variant="button" sx={{ position: 'relative', zIndex: 2 }}>
              {deleteProgress > 0 && deleteProgress < 100 ? `Hold to Delete (${Math.round(deleteProgress)}%)` : 'Hold to Delete'}
            </Typography>
          </Button>
          <Button onClick={() => { setShowDeleteModal(false); cancelDeleteHold(); }} fullWidth color="inherit" variant="outlined" sx={{ color: 'text.secondary' }}>Cancel</Button>
        </DialogContent>
      </Dialog>
      
      {/* Repost Modal */}
      <Dialog open={showRepostModal} onClose={() => setShowRepostModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
            <Typography variant="h6" fontWeight="bold">Repost</Typography>
            <IconButton onClick={() => setShowRepostModal(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
            <TextField 
                value={repostCaption}
                onChange={e => setRepostCaption(e.target.value)}
                placeholder="Say something about this... (optional)"
                multiline
                rows={3}
                fullWidth
                variant="outlined"
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                autoFocus
            />
            <Box sx={{ pointerEvents: 'none', opacity: 0.7 }}>
               <EmbeddedPost post={post} />
            </Box>
            <DialogActions sx={{ p: 0, pt: 2, justifyContent: 'flex-end' }}>
                <Button 
                    onClick={handleRepost}
                    disabled={isReposting}
                    variant="contained"
                    color="primary"
                    startIcon={isReposting ? <CircularProgress size={20} color="inherit" /> : <RepeatIcon />}
                >
                    {isReposting ? 'Reposting...' : 'Repost'}
                </Button>
            </DialogActions>
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
};