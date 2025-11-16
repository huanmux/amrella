// src/components/Status.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase, uploadStatusMedia, Profile, Status } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus, Camera, Video, Image as ImageIcon, Edit3, ChevronLeft, ChevronRight, Clock, Archive, Home, Eye } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const FOLLOW_ONLY_FEED = import.meta.env.VITE_FOLLOW_ONLY_FEED === 'true';
const DURATION = 5000; // 5 seconds per image status

// Simple hook for mobile detection
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

// Custom Hook for Status Data Fetching and Real-time Updates
const useActiveStatuses = () => {
  const { user } = useAuth();
  const [activeStatuses, setActiveStatuses] = useState<{ [key: string]: Status[] }>({});
  const [ownStatus, setOwnStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveStatuses = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // 🐛 FIX: Explicitly name the foreign key column for the join
      // Syntax: 'table_name!fk_column_name(columns_to_select)'
      // If `user_id` is the foreign key on `statuses` pointing to `profiles`, use `profiles:user_id(*)`
      let query = supabase
        .from('statuses')
        .select('*, profiles:user_id(*)') // <-- EXPLICIT JOIN FIX
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      // If follow-only, filter by follows (assuming a 'follows' table exists; adjust if needed)
      let followIds: string[] = [user.id]; // Always include own ID
      if (FOLLOW_ONLY_FEED) {
        try {
          const { data: follows, error: followError } = await supabase.from('follows').select('followed_id').eq('follower_id', user.id);
          // ⚠️ Note: The follow query itself is also returning 400. This is outside Status.tsx but related.
          // The error "HTTP/2 400" on the 'follows' query suggests RLS or table/column name issues there.
          if (followError) {
             console.warn('Error fetching follows (PGRST likely related to RLS or missing table):', followError);
          }
          followIds = [...followIds, ...(follows?.map(f => f.followed_id) || [])];
        } catch (followError) {
          console.warn('Follows table not found or error fetching follows:', followError);
        }
      }
      query = query.in('user_id', followIds);
      
      const { data, error } = await query;

      if (error) throw error;
      if (!data) return;

      // Group all active statuses by user_id, ordered by creation time
      const grouped: { [key: string]: Status[] } = {};
      data.forEach((status: Status) => {
        if (!grouped[status.user_id]) {
          grouped[status.user_id] = [];
        }
        grouped[status.user_id].push(status);
      });
      
      // Sort each group ascending
      Object.values(grouped).forEach(statuses => statuses.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));

      setActiveStatuses(grouped);
      
      // Set ownStatus to the latest one
      const ownStatuses = grouped[user.id] || [];
      setOwnStatus(ownStatuses.length > 0 ? ownStatuses[ownStatuses.length - 1] : null);

    } catch (error) {
      console.error('Error fetching statuses:', error);
      // Ensure loading state is false even on error
      setLoading(false); 
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchActiveStatuses();
    const interval = setInterval(fetchActiveStatuses, 30000); // Refresh every 30s
    
    const refreshListener = () => fetchActiveStatuses();
    window.addEventListener('statusPosted', refreshListener);
    
    // Setup real-time subscription for statuses table
    const subscription = supabase
      .channel('statuses-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'statuses' },
        refreshListener
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      window.removeEventListener('statusPosted', refreshListener);
      subscription.unsubscribe();
    };
  }, [user, fetchActiveStatuses]);

  return { activeStatuses, ownStatus, loading };
};

// StatusTray Component
export const StatusTray: React.FC = () => {
  const { user, profile } = useAuth();
  const { activeStatuses, ownStatus } = useActiveStatuses();
  const navigate = useNavigate();

  // Determine if the current user has UNVIEWED statuses
  const userHasUnviewed = useMemo(() => {
    if (!user || !activeStatuses[user.id]) return false;
    return activeStatuses[user.id].some(s => !(s.viewed_by || []).includes(user.id));
  }, [user, activeStatuses]);

  const handleOwnClick = () => {
    window.dispatchEvent(new CustomEvent('openStatusCreator'));
  };

  const handleOtherClick = (statusUserId: string) => {
    navigate(`/?status=${statusUserId}`);
    window.dispatchEvent(new CustomEvent('openStatusViewer', { detail: { userId: statusUserId } }));
  };

  if (!user) return null;

  // Prepare list of other users' latest statuses for the tray
  const otherUsersLatest = Object.entries(activeStatuses)
    .filter(([userId]) => userId !== user.id)
    .map(([, statuses]) => statuses[statuses.length - 1]) // Get latest status
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Helper to determine border color (needed for the implicit statuses access in the render)
  const getBorderColor = (status: Status) => {
    if (!user) return 'rgb(var(--color-border))';
    if (status.user_id === user.id) {
      return userHasUnviewed ? 'url(#own-grad)' : 'rgb(var(--color-border))';
    }
    const statuses = activeStatuses[status.user_id] || [];
    const hasUnviewed = statuses.some(s => !(s.viewed_by || []).includes(user.id));
    return hasUnviewed ? 'url(#grad-' + status.user_id + ')' : 'rgb(var(--color-border))';
  };


  return (
    <div className="flex space-x-4 p-4 overflow-x-auto scrollbar-hide bg-[rgb(var(--color-surface))] border-b border-[rgb(var(--color-border))]">
      {/* Own Circle */}
      <div className="flex flex-col items-center space-y-1 flex-shrink-0">
        <div 
          onClick={handleOwnClick}
          className={`relative w-16 h-16 rounded-full border-2 cursor-pointer group flex-shrink-0`}
          style={{ borderColor: ownStatus ? 'transparent' : 'rgb(var(--color-border))', borderStyle: ownStatus ? 'solid' : 'dashed' }}
        >
          <img 
            src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`}
            className="w-full h-full rounded-full object-cover"
            alt="Your avatar"
          />
          {!ownStatus && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[rgb(var(--color-primary))] rounded-full flex items-center justify-center group-hover:scale-110 transition border-2 border-[rgb(var(--color-surface))]">
              <Plus size={12} className="text-white" />
            </div>
          )}
          {ownStatus && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id={`own-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(var(--color-primary))" />
                  <stop offset="100%" stopColor="rgb(var(--color-accent))" />
                </linearGradient>
              </defs>
              <circle 
                cx="50%" cy="50%" r="50%" fill="none" 
                stroke={userHasUnviewed ? "url(#own-grad)" : "rgb(var(--color-border))"} 
                strokeWidth="3" 
              />
            </svg>
          )}
        </div>
        <span className="text-xs text-center text-[rgb(var(--color-text-secondary))] truncate w-16">Your Status</span>
      </div>

      {/* Others' Circles */}
      {otherUsersLatest.map((status) => {
        const statuses = activeStatuses[status.user_id] || [];
        const hasUnviewed = statuses.some(s => !(s.viewed_by || []).includes(user.id));

        return (
          <div key={status.user_id} className="flex flex-col items-center space-y-1 flex-shrink-0">
            <div 
              onClick={() => handleOtherClick(status.user_id)}
              className="relative w-16 h-16 rounded-full cursor-pointer flex-shrink-0"
            >
              <img 
                // The profile data is now accessed correctly via the column alias `profiles`
                src={status.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${status.profiles?.username}`}
                className="w-full h-full rounded-full object-cover"
                alt={status.profiles?.display_name}
              />
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <linearGradient id={`grad-${status.user_id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgb(var(--color-primary))" />
                    <stop offset="100%" stopColor="rgb(var(--color-accent))" />
                  </linearGradient>
                </defs>
                <circle 
                  cx="50%" cy="50%" r="50%" fill="none" 
                  stroke={hasUnviewed ? `url(#grad-${status.user_id})` : 'rgb(var(--color-border))'} 
                  strokeWidth="3" 
                />
              </svg>
            </div>
            <span className="text-xs text-center text-[rgb(var(--color-text-secondary))] truncate w-16">
              {status.profiles?.display_name || status.profiles?.username}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// StatusCreator Component (Modal for creation)
const StatusCreator: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'capture' | 'upload' | 'edit'>('capture');
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [textOverlay, setTextOverlay] = useState({ text: '', x: 50, y: 50, fontSize: 24, color: 'white' });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Capture photo
  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise(resolve => videoRef.current?.addEventListener('loadedmetadata', resolve));
        const canvas = canvasRef.current;
        if (canvas && videoRef.current) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height); // Ensure full draw
          canvas.toBlob((blob) => {
            if (blob) {
              setMediaBlob(blob);
              setMediaType('image');
              setStep('edit');
            }
            stream.getTracks().forEach(track => track.stop());
          }, 'image/jpeg');
        }
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  };

  // Record video (long press simulation with hold button)
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setMediaBlob(blob);
        setMediaType('video');
        setStep('edit');
        stream.getTracks().forEach(track => track.stop());
        chunksRef.current = [];
      };
      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecord = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // Upload file
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setMediaType('image');
      } else if (file.type.startsWith('video/')) {
        setMediaType('video');
      }
      setMediaBlob(file);
      setStep('edit');
    }
  };

  // Drag text
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = editorRef.current?.getBoundingClientRect();
    if (rect) {
      // Calculate drag offset relative to the content size (aspect-[9/16] container)
      setDragOffset({
        x: e.clientX - rect.left - (textOverlay.x * rect.width / 100),
        y: e.clientY - rect.top - (textOverlay.y * rect.height / 100),
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !editorRef.current) return;
    const rect = editorRef.current.getBoundingClientRect();
    
    // Calculate new x, y as percentages of the container
    const newX = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const newY = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

    setTextOverlay(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100, newX)),
      y: Math.max(0, Math.min(100, newY)),
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Post status
  const handlePost = async () => {
    if (!user || !mediaBlob) return;

    try {
      let uploadFile: File;
      if (mediaBlob instanceof File) {
        uploadFile = mediaBlob;
      } else {
        const extension = mediaType === 'image' ? 'jpg' : 'webm';
        const fileName = `status-${Date.now()}.${extension}`;
        uploadFile = new File([mediaBlob], fileName, { type: mediaBlob.type });
      }

      const uploadResult = await uploadStatusMedia(uploadFile);
      if (!uploadResult) {
        alert('Upload failed. Please try again.');
        return;
      }

      const { error } = await supabase
        .from('statuses')
        .insert({
          user_id: user.id, // CRITICAL: Ensure user_id is passed to satisfy RLS
          media_url: uploadResult.url,
          media_type: mediaType,
          text_overlay: textOverlay.text ? textOverlay : {},
        });

      if (error) {
        console.error('Insert error:', error);
        alert(`Failed to post status: ${error.message}`);
        return;
      }

      onClose();
      setStep('capture');
      setMediaBlob(null);
      setTextOverlay({ text: '', x: 50, y: 50, fontSize: 24, color: 'white' });
      // Trigger refresh of the StatusTray after successful post
      window.dispatchEvent(new CustomEvent('statusPosted'));
    } catch (error) {
      console.error('Post error:', error);
      alert('An error occurred while posting your status.');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center p-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="bg-[rgb(var(--color-surface))] rounded-2xl p-4 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-2 right-2 p-1 hover:bg-[rgb(var(--color-surface-hover))] rounded-full z-10">
          <X size={20} className="text-[rgb(var(--color-text))]" />
        </button>

        {step === 'capture' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-center text-[rgb(var(--color-text))]">Create Status</h2>
            {/* Added aspect ratio for portrait view during capture */}
            <div className='relative w-full aspect-[9/16] bg-black rounded overflow-hidden'> 
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            </div>
            <div className="flex space-x-2">
              <button onClick={capturePhoto} className="flex-1 p-3 bg-[rgb(var(--color-primary))] text-white rounded-lg flex items-center justify-center space-x-2">
                <Camera size={20} /> <span>Photo</span>
              </button>
              <button 
                onMouseDown={startRecord} 
                onMouseUp={stopRecord} 
                onMouseLeave={stopRecord}
                className={`flex-1 p-3 rounded-lg flex items-center justify-center space-x-2 ${recording ? 'bg-red-500' : 'bg-[rgb(var(--color-accent))]'}`}
              >
                <Video size={20} /> <span>{recording ? 'Stop' : 'Video'}</span>
              </button>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="w-full p-3 bg-[rgb(var(--color-border))] text-[rgb(var(--color-text))] rounded-lg flex items-center justify-center space-x-2">
              <ImageIcon size={20} /> <span>Upload</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />
          </div>
        )}

        {step === 'edit' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-center text-[rgb(var(--color-text))]">Edit Status</h2>
            {/* Changed h-64 to aspect-[9/16] for portrait view */}
            <div ref={editorRef} className="relative w-full aspect-[9/16] bg-black rounded overflow-hidden" style={{ position: 'relative' }}>
              {mediaType === 'image' && mediaBlob && (
                <img src={URL.createObjectURL(mediaBlob)} className="w-full h-full object-contain" alt="Preview" />
              )}
              {mediaType === 'video' && mediaBlob && (
                <video src={URL.createObjectURL(mediaBlob)} className="w-full h-full object-contain" controls muted playsInline />
              )}
              {textOverlay.text && (
                <div
                  className={`absolute select-none bg-black/50 text-white p-2 rounded transform -translate-x-1/2 -translate-y-1/2 cursor-move ${isDragging ? 'opacity-80' : 'opacity-100'}`}
                  style={{
                    left: `${textOverlay.x}%`,
                    top: `${textOverlay.y}%`,
                    fontSize: `${textOverlay.fontSize}px`,
                    color: textOverlay.color,
                  }}
                  onMouseDown={handleMouseDown}
                >
                  {textOverlay.text}
                </div>
              )}
            </div>
            <input
              type="text"
              placeholder="Add text..."
              value={textOverlay.text}
              onChange={(e) => setTextOverlay(prev => ({ ...prev, text: e.target.value }))}
              className="w-full p-2 border border-[rgb(var(--color-border))] rounded text-[rgb(var(--color-text))]"
            />
            <div className="flex space-x-2 text-sm">
              <button onClick={() => setTextOverlay(prev => ({ ...prev, fontSize: Math.min(48, prev.fontSize + 4) }))} className="p-1"><Edit3 size={16} /></button>
              <input type="color" value={textOverlay.color} onChange={(e) => setTextOverlay(prev => ({ ...prev, color: e.target.value }))} className="w-8 h-8 border-none" />
            </div>
            <button onClick={handlePost} className="w-full p-3 bg-[rgb(var(--color-primary))] text-white rounded-lg">
              Post Status
            </button>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// StatusViewer Component (Full screen for viewing)
const StatusViewer: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
  const { user } = useAuth();
  const { activeStatuses } = useActiveStatuses();
  const statuses = useMemo(() => activeStatuses[userId] || [], [activeStatuses, userId]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<number>();
  const timeoutRef = useRef<number>();

  const markStatusAsViewed = useCallback(async (status: Status) => {
    if (!user || status.viewed_by?.includes(user.id)) return;

    // Use a function to update the array to prevent race conditions (assuming you have a 'update_viewed_by' RPC)
    const { error } = await supabase.rpc('update_viewed_by', {
        status_id_in: status.id,
        user_id_in: user.id
    });

    if (error) {
        console.error("Error marking status as viewed. Attempting fallback direct update:", error);
        
        // Fallback direct update (less robust against concurrency but might be needed if RPC is missing)
        if (!status.viewed_by?.includes(user.id)) {
            const newViewedBy = [...(status.viewed_by || []), user.id];
            // Note: RLS must allow UPDATE for the authenticated user to perform this
            await supabase
                .from('statuses')
                .update({ viewed_by: newViewedBy })
                .eq('id', status.id)
                .select();
        }
    }
  }, [user]);

  const goToNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose(); // Close viewer when last status is done
      window.dispatchEvent(new CustomEvent('statusPosted')); // Trigger refresh of tray
    }
  }, [currentIndex, statuses.length, onClose]);

  const startProgress = useCallback((duration = DURATION) => {
    clearInterval(intervalRef.current);
    clearTimeout(timeoutRef.current);
    setProgress(0);
    const startTime = Date.now();
    
    intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setProgress(Math.min(100, (elapsed / duration) * 100));
    }, 50) as unknown as number;

    timeoutRef.current = setTimeout(() => {
        clearInterval(intervalRef.current);
        goToNext();
    }, duration) as unknown as number;
  }, [goToNext]);

  // Main logic to handle index change and media playback
  useEffect(() => {
    if (statuses.length === 0) {
        setLoading(false);
        return;
    }

    const current = statuses[currentIndex];
    setLoading(true);

    // CRITICAL: Mark as viewed BEFORE playback starts (or immediately on load)
    markStatusAsViewed(current);

    if (current.media_type === 'video') {
        const videoElement = videoRef.current;
        if (videoElement) {
            videoElement.pause();
            videoElement.load();
            videoElement.onloadedmetadata = () => {
                videoElement.play().catch(e => console.error("Video auto-play failed:", e));
                const videoDuration = (videoElement.duration * 1000);
                startProgress(videoDuration);
                setLoading(false);
            };
            videoElement.onended = goToNext;
        }
    } else {
        // Image status
        const img = new Image();
        img.src = current.media_url;
        img.onload = () => {
            setLoading(false);
            startProgress(DURATION);
        };
        img.onerror = () => {
             console.error("Image failed to load, skipping status.");
             goToNext();
        }
    }

    return () => {
        clearInterval(intervalRef.current);
        clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, statuses, goToNext, markStatusAsViewed, startProgress]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') setCurrentIndex(prev => Math.max(0, prev - 1));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goToNext, onClose]);

  if (statuses.length === 0) return null;

  const current = statuses[currentIndex];
  const overlay = current.text_overlay as any;

  return (
    <div className="fixed inset-0 z-[1001] bg-black flex flex-col items-center justify-center" onClick={() => onClose()}>
      {/* Container to enforce story aspect ratio and centralize content */}
      <div className="relative w-full max-w-sm aspect-[9/16] bg-black flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Progress Bars (inside the story container) */}
        <div className="flex space-x-1 p-2 absolute top-0 left-0 w-full z-20">
          {statuses.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full">
              <div 
                className={`h-full bg-white rounded-full transition-transform duration-50 ${idx < currentIndex ? 'w-full' : 'w-0'}`} 
                style={{ width: idx === currentIndex ? `${progress}%` : '' }}
              />
            </div>
          ))}
        </div>
        
        {/* Header/User Info */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between p-2 rounded-lg">
            <div className="flex items-center space-x-2">
                <img 
                    src={current.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${current.profiles?.username}`}
                    className="w-8 h-8 rounded-full object-cover"
                    alt={current.profiles?.display_name}
                />
                <span className="text-white font-bold text-sm">{current.profiles?.display_name || current.profiles?.username}</span>
                <span className="text-white/70 text-xs">{new Date(current.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <button onClick={onClose} className="text-white p-1 hover:text-gray-300"><X size={24} /></button>
        </div>

        {/* Media (Background) */}
        <div className="flex-1 flex items-center justify-center relative w-full h-full">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <span className="text-white">Loading...</span>
            </div>
          )}
          {current.media_type === 'image' && (
            <img 
              src={current.media_url} 
              className="w-full h-full object-cover" 
              alt="Status" 
              key={current.id}
            />
          )}
          {current.media_type === 'video' && (
            <video 
              ref={videoRef}
              src={current.media_url} 
              className="w-full h-full object-cover" 
              muted 
              playsInline 
              loop={false}
              key={current.id} // Key ensures re-render and reload for new video status
            />
          )}
          {/* Text Overlay */}
          {overlay.text && (
            <div 
              className="absolute text-white p-2 rounded max-w-[80%] bg-black/50"
              style={{ 
                left: `${overlay.x}%`, 
                top: `${overlay.y}%`, 
                fontSize: `${overlay.fontSize}px`,
                color: overlay.color,
                transform: 'translate(-50%, -50%)', // Center text based on percentage coordinates
              }}
            >
              {overlay.text}
            </div>
          )}
        </div>

        {/* Navigation Overlays (Click to skip/go back) */}
        <div className="absolute inset-0 flex justify-between z-10">
            <div className='w-1/3 h-full' onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => Math.max(0, prev - 1)); }} />
            <div className='w-1/3 h-full' onClick={(e) => e.stopPropagation()} />
            <div className='w-1/3 h-full' onClick={(e) => { e.stopPropagation(); goToNext(); }} />
        </div>
      </div>
    </div>
  );
};

// StatusArchive Component
export const StatusArchive: React.FC = () => {
  const { user } = useAuth();
  const [allStatuses, setAllStatuses] = useState<Status[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);

  useEffect(() => {
    if (!user) {
      setAllStatuses([]);
      return;
    }
    const fetchAll = async () => {
      try {
        // FIX: Explicitly name the foreign key column for the join
        const { data, error } = await supabase
          .from('statuses')
          .select('*, profiles:user_id(*)') // <-- EXPLICIT JOIN FIX
          .eq('user_id', user.id) // IMPORTANT: Filter by current user ID
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setAllStatuses(data || []);
      } catch (error) {
        console.error('Error fetching archive:', error);
      }
    };
    fetchAll();
  }, [user]);

  const openArchiveViewer = (status: Status) => setSelectedStatus(status);

  if (!user) {
    return <div className="p-8 text-center text-[rgb(var(--color-text-secondary))]">Please log in to view your archive.</div>;
  }
  
  if (allStatuses.length === 0) {
    return (
      <div className="p-8 text-center text-[rgb(var(--color-text-secondary))]">
        <Archive size={48} className="mx-auto mb-4 opacity-50" />
        <p>No statuses in your archive yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Status Archive</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allStatuses.map((status) => (
          <div key={status.id} className="relative group cursor-pointer" onClick={() => openArchiveViewer(status)}>
            <div className="relative w-full aspect-square overflow-hidden rounded">
                {status.media_type === 'image' ? (
                  <img src={status.media_url} className="w-full h-full object-cover" alt="Archive" />
                ) : (
                  <video src={status.media_url} className="w-full h-full object-cover" muted />
                )}
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-2 rounded transition-opacity">
              <div className='flex items-center space-x-1 text-white text-sm'>
                <Clock size={12} />
                <span>{new Date(status.created_at).toLocaleDateString()}</span>
              </div>
              <div className='flex items-center space-x-1 text-white text-sm'>
                <Eye size={12} />
                <span>{status.viewed_by?.length || 0} views</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Simple Viewer Modal */}
      {selectedStatus && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4" onClick={() => setSelectedStatus(null)}>
          <div className="relative w-full max-w-md" onClick={e => e.stopPropagation()}>
            {/* Added aspect ratio for portrait view in archive viewer */}
            <div className='relative w-full aspect-[9/16] bg-black rounded overflow-hidden'> 
                {selectedStatus.media_type === 'image' ? (
                  <img src={selectedStatus.media_url} className="w-full h-full object-contain" alt="Full" />
                ) : (
                  <video src={selectedStatus.media_url} className="w-full h-full object-contain" controls muted playsInline />
                )}
            </div>
            <button onClick={() => setSelectedStatus(null)} className="absolute top-2 right-2 text-white p-2 z-10"><X size={24} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

// StatusSidebar Component
interface StatusSidebarProps {
  show: boolean;
  onClose: () => void;
  setView: (view: string) => void;
  view: string;
}

export const StatusSidebar: React.FC<StatusSidebarProps> = ({ show, onClose, setView, view }) => {
  // Always use the mobile-style toggled overlay behavior
  const menuItems = [
    { icon: <Home size={20} />, label: 'Home', view: 'feed', onClick: () => { setView('feed'); onClose(); } },
    { icon: <Archive size={20} />, label: 'Status Archive', view: 'archive', onClick: () => { setView('archive'); onClose(); } },
  ];

  // Sidebar visibility and closing is handled by Tailwind classes and the overlay
  const sidebarClass = `
    fixed left-0 top-0 h-full w-64 bg-[rgb(var(--color-surface))] border-r border-[rgb(var(--color-border))] z-[100] 
    ${show ? 'translate-x-0' : '-translate-x-full'}
    transition-transform duration-300 shadow-lg
  `;

  return (
    <>
      {/* Sidebar */}
      <div className={sidebarClass}>
        <nav className="p-4 space-y-2 h-full flex flex-col">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${
                view === item.view
                  ? 'bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))]'
                  : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface-hover))]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
      {/* Overlay to close sidebar on click outside - CRITICAL FIX */}
      {show && <div className="fixed inset-0 bg-black/50 z-[99]" onClick={onClose} />}
    </>
  );
};

// Global Modals (attach to window for cross-component)
export const Status: React.FC = () => {
  const [showCreator, setShowCreator] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenCreator = () => setShowCreator(true);
    const handleOpenViewer = (e: CustomEvent) => setViewerUserId(e.detail.userId);
    const handleStatusPosted = () => {
        // Close creator
        setShowCreator(false);
    };

    window.addEventListener('openStatusCreator', handleOpenCreator);
    window.addEventListener('openStatusViewer', handleOpenViewer as EventListener);
    window.addEventListener('statusPosted', handleStatusPosted);

    return () => {
      window.removeEventListener('openStatusCreator', handleOpenCreator);
      window.removeEventListener('openStatusViewer', handleOpenViewer as EventListener);
      window.removeEventListener('statusPosted', handleStatusPosted);
    };
  }, []);

  return (
    <>
      {showCreator && <StatusCreator onClose={() => setShowCreator(false)} />}
      {viewerUserId && <StatusViewer userId={viewerUserId} onClose={() => setViewerUserId(null)} />}
    </>
  );
};
