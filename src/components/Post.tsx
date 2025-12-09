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

// --- TYPES ---
export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string;
    verified: boolean;
  };
}

export interface Liker {
  user_id: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string;
    verified: boolean;
  };
}

// --- UTILS ---
const SVG_PATH = "M214.59 81.627c-1.391 3.625-1.8 22.278-.673 30.713 2.126 15.91 7.978 28.209 18.377 38.625 8.015 8.028 16.264 12.279 25.192 12.984l6.987.551.656 4c.36 2.2.452 4.338.204 4.75s-16.119.75-35.27.75c-27.03 0-35.055.286-35.878 1.277-1.207 1.454-6.514 51.381-5.616 52.834.8 1.296 17.805 9.766 35.931 17.898C282.583 272.066 298.351 279 299.52 279c1.629 0 32.848-32.375 33.313-34.547.183-.855-3.275-12.669-7.685-26.253-4.409-13.585-9.509-29.425-11.333-35.2l-3.315-10.5-16.246.124c-8.935.068-17.598.395-19.25.725-2.964.593-3.003.545-2.96-3.624.055-5.301 2.307-11.827 4.661-13.505.987-.703 4.623-3.114 8.08-5.356 12.265-7.955 16.934-17.312 18.211-36.496.444-6.672 1.33-13.109 1.97-14.305 2.586-4.831.031-4.201-5.897 1.452-11.689 11.15-21.44 28.376-25.171 44.471-3.461 14.93-5.903 20.509-5.892 13.464.003-2.172.441-6.61.973-9.86 1.286-7.853-.23-18.167-3.736-25.418-3.789-7.836-13.052-16.799-31.473-30.456-8.538-6.33-15.831-12.005-16.206-12.612-.979-1.584-2.252-1.361-2.974.523M171 260.682c-1.375.268-2.882.854-3.35 1.302-.924.887 6.652 26.164 8.892 29.668.756 1.183 12.981 8.332 27.167 15.887 14.185 7.555 33.059 17.72 41.941 22.588l16.151 8.851 5.349-2.325c2.943-1.278 11.75-4.725 19.573-7.659l14.223-5.334 9.592-12.762c5.276-7.019 10.238-13.297 11.027-13.952 2.632-2.185 1.483-3.79-3.815-5.328-7.221-2.095-55.356-13.369-83.25-19.498-12.65-2.779-29.3-6.485-37-8.235-13.989-3.179-21.789-4.122-26.5-3.203m.504 71.312c-.227.367 1.087 2.896 2.921 5.618 2.958 4.392 10.6 17.779 22.909 40.126 2.192 3.981 5.859 9.156 8.147 11.5 6.4 6.555 44.639 29.762 49.04 29.762 2.295 0 25.842-9.216 26.714-10.456.404-.574.741-12.164.75-25.755l.015-24.712-3.75-.978c-11.319-2.952-18.565-4.671-44.377-10.53-15.605-3.542-35.929-8.421-45.165-10.841s-16.977-4.101-17.204-3.734"
const SVG_VIEWBOX = "0 0 500 500";

// Embed helper to extract first URL
const extractFirstUrl = (text: string): string | null => {
  const match = text.match(/(https?:\/\/[^\s]+)/);
  return match ? match[0] : null;
};

export const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const primaryColor = 'rgb(var(--color-accent))';
  const trackColor = 'rgb(var(--color-border))';

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const audio = audioRef.current;
    if (audio) { audio.currentTime = time; setCurrentTime(time); }
  };

  return (
    <div className="flex items-center space-x-2 w-full max-w-full p-2 bg-[rgb(var(--color-surface-hover))] rounded-xl">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button onClick={handlePlayPause} className="flex-shrink-0 p-2 rounded-full transition-colors" style={{ backgroundColor: primaryColor, color: 'rgb(var(--color-text-on-primary))' }}>
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <input type="range" min="0" max={duration} step="0.01" value={currentTime} onChange={handleSeek} className="w-full h-1 appearance-none rounded-full cursor-pointer transition" style={{ background: `linear-gradient(to right, ${primaryColor} 0%, ${primaryColor} ${((currentTime / duration) * 100) || 0}%, ${trackColor} ${((currentTime / duration) * 100) || 0}%, ${trackColor} 100%)` }} />
        <span className="text-xs flex-shrink-0 text-[rgb(var(--color-text-secondary))]">{formatTime(currentTime)}/{formatTime(duration)}</span>
      </div>
    </div>
  );
};

// Replaces getEmbeddedMedia. purely handles generating the YouTube iframe from a URL string.
const getYoutubeEmbed = (url: string) => {
  if (!url) return null;
  const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([\w-]{11})/i);
  
  if (youtubeMatch && youtubeMatch[1]) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden bg-black">
        <iframe 
          title="YouTube" 
          className="w-full aspect-video" 
          src={`https://www.youtube.com/embed/${youtubeMatch[1]}`} 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </div>
    );
  }
  return null;
};

// --- SUB COMPONENTS ---

const EmbeddedPost: React.FC<{ post: PostType; isDeleted?: boolean }> = ({ post, isDeleted }) => {
  const [embedComponent, setEmbedComponent] = useState<React.ReactNode>(null);
  const [textToDisplay, setTextToDisplay] = useState('');

  useEffect(() => {
    if (isDeleted || !post) return;
    
    // Process text for embeds
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
      <div className="mt-2 p-4 border border-[rgb(var(--color-border))] rounded-xl bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-secondary))] italic text-sm flex items-center gap-2">
         <X size={16} /> [Original post has been deleted or cannot be found right now]
      </div>
    );
  }

  return (
    <div className="mt-3 border border-[rgb(var(--color-border))] rounded-xl overflow-hidden hover:bg-[rgb(var(--color-surface-hover))] transition cursor-pointer">
       {/* Simple Header */}
       <div className="p-3 pb-1 flex items-center gap-2">
          <img src={post.profiles?.avatar_url} className="w-6 h-6 rounded-full" alt="" />
          <span className="font-bold text-sm text-[rgb(var(--color-text))]">{post.profiles?.display_name}</span>
          <span className="text-xs text-[rgb(var(--color-text-secondary))]">@{post.profiles?.username} • {new Date(post.created_at).toLocaleDateString()}</span>
       </div>
       
       {/* Content */}
       <div className="p-3 pt-1">
          {textToDisplay && <p className="text-sm text-[rgb(var(--color-text))] line-clamp-3 mb-2">{textToDisplay}</p>}
          {embedComponent}
          
          {post.media_url && (
             <div className="mt-2 rounded-lg overflow-hidden h-40 bg-black/5 relative">
                {post.media_type === 'image' && <img src={post.media_url} className="w-full h-full object-cover" alt="Media" />}
                {post.media_type === 'video' && <video src={post.media_url} className="w-full h-full object-cover" />}
                {post.media_type === 'audio' && <div className="p-4 flex items-center justify-center h-full"><span className="text-xs font-bold uppercase tracking-widest opacity-50">Audio Attachment</span></div>}
             </div>
          )}
       </div>
    </div>
  );
};

const Lightbox: React.FC<{ url: string; type: 'image' | 'video'; onClose: () => void }> = ({ url, type, onClose }) => (
  <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-pointer" onClick={onClose}>
    <div className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
      {type === 'image' && <img src={url} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" alt="Full size" />}
      {type === 'video' && (
        <video controls autoPlay className="max-w-full max-h-[90vh] rounded-2xl">
          <source src={url} /> Your browser does not support the video tag.
        </video>
      )}
    </div>
    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition"><X size={24} /></button>
  </div>
);

// --- MAIN POST COMPONENT ---

interface PostItemProps {
  post: PostType;
  currentUserId?: string;
  isLiked: boolean;
  onLikeToggle: (post: PostType) => void; // Parent handles the logic and passes updated post or triggers refresh
  onCommentUpdate: (post: PostType) => void; // Parent updates count
  onDelete?: (post: PostType) => void; // Optional, mostly for Profile
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
  // Modal States
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxType, setLightboxType] = useState<'image' | 'video' | null>(null);
  
  // Logic States
  const [likersList, setLikersList] = useState<Liker[]>([]);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Repost Logic
  const [repostCaption, setRepostCaption] = useState('');
  const [isReposting, setIsReposting] = useState(false);

  const handleRepost = async () => {
      if (!currentUserId) return;
      setIsReposting(true);
      
      const targetPostId = post.id; // We repost THIS post

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
          alert("Reposted!"); 
      } else {
          alert("Failed to repost.");
      }
      setIsReposting(false);
  };

  // Edit Logic
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [displayContent, setDisplayContent] = useState(post.content);

  // Delete Logic
  const [deleteProgress, setDeleteProgress] = useState(0);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isOnline = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return false;
    return (new Date().getTime() - new Date(lastSeen).getTime()) < 300000;
  };

  // Sync local content with prop updates
  useEffect(() => {
    setDisplayContent(post.content);
    setEditContent(post.content);
  }, [post.content]);

  // --- SHARE LOGIC ---
  const handleShare = () => {
    const url = `${window.location.origin}/?post=${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setOpenMenu(false);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  // --- EDIT LOGIC ---
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
      // Note: We update local display content immediately. 
      // The parent prop might lag until a refresh/realtime event, 
      // but this ensures the UI feels responsive.
    } else {
      alert("Failed to update post.");
    }
  };

  // --- LIKES LOGIC ---
  const fetchLikers = async () => {
    const { data } = await supabase.from('likes').select('user_id, profiles(*)').eq('entity_id', post.id).eq('entity_type', 'post');
    if (data) setLikersList(data as unknown as Liker[]);
  };

  const handleLikeClick = async () => {
    if (!currentUserId) return;
    onLikeToggle(post); // Optimistic update in parent
    
    if (!isLiked) {
       await supabase.from('likes').insert({ user_id: currentUserId, entity_id: post.id, entity_type: 'post' });
    }
    setShowLikesModal(true);
    fetchLikers();
  };

  const removeLikeFromModal = async () => {
      if (!currentUserId) return;
      // Call parent to toggle state back
      onLikeToggle(post);
      // Update local list
      setLikersList(prev => prev.filter(l => l.user_id !== currentUserId));
      // DB
      await supabase.from('likes').delete().match({ user_id: currentUserId, entity_id: post.id, entity_type: 'post' });
  };

  useEffect(() => {
    if (showLikesModal) fetchLikers();
  }, [showLikesModal]);


  // --- COMMENTS LOGIC ---
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

  // --- DELETE LOGIC ---
  const startDeleteHold = () => {
    setDeleteProgress(0);
    let progress = 0;
    holdIntervalRef.current = setInterval(() => {
      progress += 2; // 50ms * 50 steps = 2.5s approx (sped up for UX)
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

  const isAuthor = currentUserId === post.user_id;

  // Type helper to access groups safely without changing global types immediately
  const groupData = (post as any).groups;

  return (
    <>
      <div className="border-b border-[rgb(var(--color-border))] p-4 hover:bg-[rgb(var(--color-surface-hover))] transition bg-[rgb(var(--color-surface))]">
        {/* SPECIAL EVENT RGB OVERLAY */}
        {SPECIAL_EVENT_MODE && <div className="special-event-overlay" />}
        
        <div className="flex gap-4 items-start">
          <button onClick={() => onNavigateToProfile(post.user_id)} className="flex-shrink-0 relative">
            <img src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.profiles?.username}`} className="w-12 h-12 rounded-full hover:opacity-80 transition" alt="Avatar" />
            {isOnline(post.profiles?.last_seen) && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[rgb(var(--color-surface))] rounded-full" />}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <button onClick={() => onNavigateToProfile(post.user_id)} className="font-bold hover:underline text-[rgb(var(--color-text))]">{post.profiles?.display_name}</button>
              {post.profiles?.verified && <BadgeCheck size={16} className="text-[rgb(var(--color-accent))]" />}
              <span className="text-[rgb(var(--color-text-secondary))] text-sm">@{post.profiles?.username}</span>
              {/* --- CUSTOM BADGE --- */}
              {(post.profiles as any)?.badge_url && (
                  <div className="group relative inline-flex items-center justify-center h-4 px-1.5 min-w-[18px] rounded overflow-visible align-middle select-none ml-0.5">
                    <div className="absolute inset-0 bg-cover bg-center rounded-sm" style={{ backgroundImage: `url(${(post.profiles as any).badge_url})` }} />
                    {(post.profiles as any)?.badge_text && (
                       <span className="relative z-10 text-[8px] font-black text-white uppercase tracking-wider drop-shadow-md shadow-black">{(post.profiles as any).badge_text}</span>
                    )}
                    {(post.profiles as any)?.badge_tooltip && (
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-max max-w-[120px] px-2 py-1 bg-black/90 backdrop-blur text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 text-center shadow-xl">
                        {(post.profiles as any).badge_tooltip}
                      </div>
                    )}
                  </div>
              )}
              <span className="text-[rgb(var(--color-text-secondary))] text-sm">· {new Date(post.created_at).toLocaleDateString()} at {formatTime(post.created_at)}</span>
            </div>

            {groupData && (
                <div 
                   className="flex items-center gap-2 mt-1 cursor-pointer group w-fit" 
                   // Note: You might want to pass a handler to PostItem to perform navigation (e.g. setView('groups'))
                   // For now, this is purely visual as requested.
                >
                   <img src={groupData.icon_url || `https://ui-avatars.com/api/?name=${groupData.name}&background=random`} className="w-5 h-5 rounded-md border border-[rgb(var(--color-border))]" alt="Group" />
                   <span className="text-xs font-bold text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))] transition">{groupData.name}</span>
                </div>
            )}
            
            {isEditing ? (
              <div className="mt-2 space-y-2">
                 <textarea 
                    value={editContent} 
                    onChange={(e) => setEditContent(e.target.value)} 
                    className="w-full p-2 bg-[rgb(var(--color-background))] border border-[rgb(var(--color-border))] rounded-lg text-[rgb(var(--color-text))] outline-none resize-none focus:border-[rgb(var(--color-primary))]"
                    rows={3}
                    autoFocus
                 />
                 <div className="flex gap-2 justify-end">
                    <button onClick={() => { setIsEditing(false); setEditContent(displayContent); }} className="text-sm text-[rgb(var(--color-text-secondary))] hover:underline">Cancel</button>
                    <button onClick={handleUpdatePost} className="text-sm bg-[rgb(var(--color-primary))] text-white px-3 py-1 rounded-full font-bold">Save</button>
                 </div>
              </div>
            ) : (
              <>
                 {/* UNIFIED EMBED LOGIC & URL CLEANING */}
                 {(() => {
                    let textToDisplay = displayContent;
                    let embedComponent = null;

                    // 1. If user uploaded a file directly, that takes priority.
                    if (!post.media_url) {
                       // 2. Extract the first URL found in the text
                       const url = extractFirstUrl(displayContent);
                       
                       if (url) {
                          // Clean the URL from the displayed text
                          textToDisplay = displayContent.replace(url, '').trim();

                          // 3. Check if it's YouTube -> Render Iframe
                          const youtubeEmbed = getYoutubeEmbed(url);
                          if (youtubeEmbed) {
                             embedComponent = youtubeEmbed;
                          } else {
                             // 4. If not YouTube -> Render MessageEmbed
                             embedComponent = <MessageEmbed url={url} />;
                          }
                       }
                    }

                    return (
                       <>
                          {/* Only render text paragraph if there is text remaining after stripping URL */}
                          {textToDisplay && (
                             <p className="mt-1 whitespace-pre-wrap break-words text-[rgb(var(--color-text))]">
                                {textToDisplay}
                             </p>
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
              </>
            )}

            {post.media_url && (
              <div className="mt-3">
                {post.media_type === 'image' && <img src={post.media_url} className="rounded-2xl max-h-96 object-cover w-full cursor-pointer transition hover:opacity-90" alt="Post" onClick={() => { setLightboxType('image'); setShowLightbox(true); }} />}
                {post.media_type === 'video' && (
                    <div className="relative cursor-pointer" onClick={() => { setLightboxType('video'); setShowLightbox(true); }}>
                         <video src={post.media_url} className="rounded-2xl max-h-96 w-full object-cover" />
                         <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition rounded-2xl">
                            <Play size={48} className="text-white opacity-80" />
                         </div>
                    </div>
                )}
                {post.media_type === 'audio' && <div className="rounded-2xl w-full"><AudioPlayer src={post.media_url} /></div>}
                {post.media_type === 'document' && (
                  <a href={post.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-[rgb(var(--color-surface-hover))] rounded-lg hover:bg-[rgb(var(--color-border))] transition inline-block text-[rgb(var(--color-text))]">
                    <FileText size={20} className="text-[rgb(var(--color-text-secondary))]" /> Download File
                  </a>
                )}
              </div>
            )}

            <div className="flex items-center gap-6 mt-3">
              <div className="flex items-center gap-1 group">
                <button onClick={(e) => { e.stopPropagation(); handleLikeClick(); }} className={`p-2 rounded-full transition ${isLiked ? 'text-pink-500 bg-pink-500/10' : 'text-[rgb(var(--color-text-secondary))] hover:bg-pink-500/10 hover:text-pink-500'}`}>
                  <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                </button>
                {post.like_count > 0 && <button onClick={(e) => { e.stopPropagation(); setShowLikesModal(true); }} className="text-sm text-[rgb(var(--color-text-secondary))] hover:underline">{post.like_count}</button>}
              </div>
              <div className="flex items-center gap-1 group">
                <button onClick={(e) => { e.stopPropagation(); setShowCommentsModal(true); }} className="p-2 rounded-full transition text-[rgb(var(--color-text-secondary))] hover:bg-blue-500/10 hover:text-blue-500">
                  <MessageCircle size={18} />
                </button>
                {post.comment_count > 0 && <button onClick={(e) => { e.stopPropagation(); setShowCommentsModal(true); }} className="text-sm text-[rgb(var(--color-text-secondary))] hover:underline">{post.comment_count}</button>}
              </div>
              <div className="flex items-center gap-1 group">
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowRepostModal(true); }} 
                    className="p-2 rounded-full transition text-[rgb(var(--color-text-secondary))] hover:bg-green-500/10 hover:text-green-500"
                >
                  <Repeat size={18} />
                </button>
                {(post.repost_count || 0) > 0 && <span className="text-sm text-[rgb(var(--color-text-secondary))]">{post.repost_count}</span>}
              </div>
            </div>
          </div>

          <div className="relative flex-shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setOpenMenu(!openMenu); }} className="p-1 rounded-full text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface-hover))] transition">
               {shareCopied ? <Check size={20} className="text-green-500" /> : <MoreVertical size={20} />}
            </button>
            {openMenu && (
              <>
                <div className="fixed inset-0 z-0" onClick={() => setOpenMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-lg shadow-xl overflow-hidden z-10">
                  {/* Share Option - Everyone */}
                  <button onClick={handleShare} className="w-full text-left p-3 text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-hover))] transition flex items-center gap-2">
                    <Share2 size={18} /> Share Post
                  </button>

                  {/* Edit/Delete Options - Author Only */}
                  {isAuthor && (
                    <>
                      <button onClick={() => { setIsEditing(true); setOpenMenu(false); }} className="w-full text-left p-3 text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-hover))] transition flex items-center gap-2">
                         <Edit3 size={18} /> Edit Post
                      </button>
                      <button onClick={() => { setShowDeleteModal(true); setOpenMenu(false); }} className="w-full text-left p-3 text-red-500 hover:bg-red-50 transition flex items-center gap-2">
                        <Trash2 size={18} /> Delete Post
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showLightbox && post.media_url && <Lightbox url={post.media_url} type={lightboxType || 'image'} onClose={() => setShowLightbox(false)} />}

      {showLikesModal && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4" onClick={() => setShowLikesModal(false)}>
          <div className="bg-[rgb(var(--color-surface))] w-full max-w-md rounded-2xl max-h-[70vh] flex flex-col shadow-2xl border border-[rgb(var(--color-border))]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[rgb(var(--color-border))] flex items-center justify-between">
              <h3 className="font-bold text-lg text-[rgb(var(--color-text))]">Likes</h3>
              <button onClick={() => setShowLikesModal(false)} className="p-1 hover:bg-[rgb(var(--color-surface-hover))] rounded-full"><X size={20} className="text-[rgb(var(--color-text))]" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              {likersList.length === 0 ? <p className="text-center text-[rgb(var(--color-text-secondary))]">No likes yet.</p> : likersList.map((liker, idx) => (
                <div key={`${liker.user_id}-${idx}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigateToProfile(liker.user_id)}>
                    <img src={liker.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${liker.profiles?.username}`} className="w-10 h-10 rounded-full" alt="Avatar" />
                    <div>
                      <div className="font-bold hover:underline text-[rgb(var(--color-text))] text-sm flex items-center">
                         {liker.profiles?.display_name} {liker.profiles?.verified && <BadgeCheck size={14} className="ml-1 text-[rgb(var(--color-accent))]" />}
                      </div>
                      <span className="text-sm text-[rgb(var(--color-text-secondary))]">@{liker.profiles?.username}</span>
                    </div>
                  </div>
                  {liker.user_id === currentUserId && (
                    <button onClick={removeLikeFromModal} className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition"><Heart size={16} className="fill-current" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCommentsModal && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4" onClick={() => setShowCommentsModal(false)}>
           <div className="bg-[rgb(var(--color-surface))] w-full max-w-lg rounded-2xl h-[80vh] flex flex-col shadow-2xl border border-[rgb(var(--color-border))]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[rgb(var(--color-border))] flex items-center justify-between">
              <h3 className="font-bold text-lg text-[rgb(var(--color-text))]">Comments</h3>
              <button onClick={() => setShowCommentsModal(false)} className="p-1 hover:bg-[rgb(var(--color-surface-hover))] rounded-full"><X size={20} className="text-[rgb(var(--color-text))]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
               {commentsList.length === 0 ? <div className="h-full flex items-center justify-center text-[rgb(var(--color-text-secondary))]">No comments yet.</div> : commentsList.map((comment) => (
                 <div key={comment.id} className="flex gap-3">
                   <img src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.profiles?.username}`} className="w-9 h-9 rounded-full cursor-pointer flex-shrink-0" alt="Avatar" onClick={() => onNavigateToProfile(comment.user_id)} />
                   <div className="flex-1">
                     <div className="flex items-baseline gap-2">
                       <button onClick={() => onNavigateToProfile(comment.user_id)} className="font-bold hover:underline text-[rgb(var(--color-text))] text-sm">{comment.profiles?.display_name}</button>
                       <span className="text-xs text-[rgb(var(--color-text-secondary))]">{formatTime(comment.created_at)}</span>
                     </div>
                     <p className="text-[rgb(var(--color-text))] text-sm mt-0.5 whitespace-pre-wrap break-words bg-[rgb(var(--color-surface-hover))] p-2 rounded-r-xl rounded-bl-xl inline-block">{comment.content}</p>
                   </div>
                 </div>
               ))}
            </div>
            <form onSubmit={handlePostComment} className="p-3 border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] rounded-b-2xl">
              <div className="flex items-center gap-2 bg-[rgb(var(--color-surface-hover))] rounded-full px-4 py-2">
                <input type="text" value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Add a comment..." className="flex-1 bg-transparent border-none outline-none text-sm text-[rgb(var(--color-text))]" autoFocus />
                <button type="submit" disabled={!newCommentText.trim() || isPostingComment} className="text-[rgb(var(--color-accent))] disabled:opacity-50 hover:text-[rgb(var(--color-primary))] transition"><Send size={18} /></button>
              </div>
            </form>
           </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowDeleteModal(false); cancelDeleteHold(); }}>
          <div className="bg-[rgb(var(--color-surface))] rounded-2xl w-full max-w-sm flex flex-col p-6 text-[rgb(var(--color-text))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4"><Trash2 size={24} className="text-red-500 flex-shrink-0" /><h3 className="font-bold text-xl">Confirm Deletion</h3></div>
            <p className="mb-6">Are you sure? This action cannot be undone!</p>
            <button
              onMouseDown={startDeleteHold} onMouseUp={cancelDeleteHold} onMouseLeave={cancelDeleteHold}
              onTouchStart={startDeleteHold} onTouchEnd={cancelDeleteHold}
              className="relative w-full py-3 rounded-xl font-bold text-lg text-white bg-red-500 overflow-hidden disabled:opacity-50 transition duration-100"
            >
              <div className="absolute inset-0 bg-red-700 transition-all duration-50" style={{ width: `${deleteProgress}%` }} />
              <span className="relative z-10">{deleteProgress > 0 ? `Hold to Delete` : 'Hold to Delete'}</span>
            </button>
            <button onClick={() => { setShowDeleteModal(false); cancelDeleteHold(); }} className="mt-3 w-full py-2 text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface-hover))] rounded-xl transition">Cancel</button>
          </div>
        </div>
      )}

      {showRepostModal && (
          <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4" onClick={() => setShowRepostModal(false)}>
              <div className="bg-[rgb(var(--color-surface))] w-full max-w-lg rounded-2xl flex flex-col shadow-2xl border border-[rgb(var(--color-border))]" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-[rgb(var(--color-border))] flex items-center justify-between">
                      <h3 className="font-bold text-lg text-[rgb(var(--color-text))]">Repost</h3>
                      <button onClick={() => setShowRepostModal(false)} className="p-1 hover:bg-[rgb(var(--color-surface-hover))] rounded-full"><X size={20} className="text-[rgb(var(--color-text))]" /></button>
                  </div>
                  <div className="p-4">
                      {/* Input for Caption */}
                      <div className="flex gap-3 mb-4">
                          <textarea 
                              value={repostCaption}
                              onChange={e => setRepostCaption(e.target.value)}
                              placeholder="Say something about this... (optional)"
                              className="w-full bg-transparent outline-none text-[rgb(var(--color-text))] resize-none h-24 p-2 border border-[rgb(var(--color-border))] rounded-lg"
                              autoFocus
                          />
                      </div>

                      {/* Preview of the post being reposted */}
                      <div className="pointer-events-none opacity-80">
                         <EmbeddedPost post={post} />
                      </div>

                      <div className="flex justify-end mt-4">
                          <button 
                              onClick={handleRepost}
                              disabled={isReposting}
                              className="bg-[rgb(var(--color-accent))] text-white font-bold py-2 px-6 rounded-full hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
                          >
                              <Repeat size={18} />
                              {isReposting ? 'Reposting...' : 'Repost'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};
