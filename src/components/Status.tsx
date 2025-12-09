// src/components/Status.tsx
import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { supabase, uploadStatusMedia, Profile, Status as StatusType } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  X, 
  Plus, 
  ImageIcon, 
  BadgeCheck,
  Archive, 
  Send,
  Check,     // For "Sent"
  RefreshCcw, // For flipping camera
  Eye,       // For view count
  Gift,      // For GIF mode
  Search,    // For GIF search
} from 'lucide-react';
import { ProfileWithStatus } from '../lib/types'; 

const FOLLOW_ONLY_FEED = import.meta.env.VITE_FOLLOW_ONLY_FEED === 'true';

const SVG_PATH = "M214.59 81.627c-1.391 3.625-1.8 22.278-.673 30.713 2.126 15.91 7.978 28.209 18.377 38.625 8.015 8.028 16.264 12.279 25.192 12.984l6.987.551.656 4c.36 2.2.452 4.338.204 4.75s-16.119.75-35.27.75c-27.03 0-35.055.286-35.878 1.277-1.207 1.454-6.514 51.381-5.616 52.834.8 1.296 17.805 9.766 35.931 17.898C282.583 272.066 298.351 279 299.52 279c1.629 0 32.848-32.375 33.313-34.547.183-.855-3.275-12.669-7.685-26.253-4.409-13.585-9.509-29.425-11.333-35.2l-3.315-10.5-16.246.124c-8.935.068-17.598.395-19.25.725-2.964.593-3.003.545-2.96-3.624.055-5.301 2.307-11.827 4.661-13.505.987-.703 4.623-3.114 8.08-5.356 12.265-7.955 16.934-17.312 18.211-36.496.444-6.672 1.33-13.109 1.97-14.305 2.586-4.831.031-4.201-5.897 1.452-11.689 11.15-21.44 28.376-25.171 44.471-3.461 14.93-5.903 20.509-5.892 13.464.003-2.172.441-6.61.973-9.86 1.286-7.853-.23-18.167-3.736-25.418-3.789-7.836-13.052-16.799-31.473-30.456-8.538-6.33-15.831-12.005-16.206-12.612-.979-1.584-2.252-1.361-2.974.523M171 260.682c-1.375.268-2.882.854-3.35 1.302-.924.887 6.652 26.164 8.892 29.668.756 1.183 12.981 8.332 27.167 15.887 14.185 7.555 33.059 17.72 41.941 22.588l16.151 8.851 5.349-2.325c2.943-1.278 11.75-4.725 19.573-7.659l14.223-5.334 9.592-12.762c5.276-7.019 10.238-13.297 11.027-13.952 2.632-2.185 1.483-3.79-3.815-5.328-7.221-2.095-55.356-13.369-83.25-19.498-12.65-2.779-29.3-6.485-37-8.235-13.989-3.179-21.789-4.122-26.5-3.203m.504 71.312c-.227.367 1.087 2.896 2.921 5.618 2.958 4.392 10.6 17.779 22.909 40.126 2.192 3.981 5.859 9.156 8.147 11.5 6.4 6.555 44.639 29.762 49.04 29.762 2.295 0 25.842-9.216 26.714-10.456.404-.574.741-12.164.75-25.755l.015-24.712-3.75-.978c-11.319-2.952-18.565-4.671-44.377-10.53-15.605-3.542-35.929-8.421-45.165-10.841s-16.977-4.101-17.204-3.734"
const SVG_VIEWBOX = "0 0 500 500";

// =======================================================================
//  1. STATUS TRAY
//  Updated with "Unseen" logic & Upload Progress Bar on own avatar.
// =======================================================================

export const StatusTray: React.FC = () => {
  const { user, profile } = useAuth();
  const [statusUsers, setStatusUsers] = useState<ProfileWithStatus[]>([]);
  const [ownStatus, setOwnStatus] = useState<ProfileWithStatus | null>(null);
  // ADDED: State for upload progress for the new feature
  const [uploadProgress, setUploadProgress] = useState<number | null>(null); // null means not uploading

  // ADDED: Effect to handle upload progress updates
  useEffect(() => {
    const handleProgress = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const progress = detail.progress as number;
      
      if (progress === 100) {
        // Upload finished. Give it a moment for the DB to update/fetch to happen, then clear.
        setTimeout(() => setUploadProgress(null), 1000); 
      } else {
        setUploadProgress(progress);
      }
    };
    
    window.addEventListener('statusUploadProgress', handleProgress as EventListener);
    
    return () => {
      window.removeEventListener('statusUploadProgress', handleProgress as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!user || !profile) return;

    const fetchActiveStatuses = async () => {
      try {
        let statusQuery = supabase
          .from('statuses')
          .select('*, profiles!user_id(*)')
          .gt('expires_at', new Date().toISOString()) // <-- Expiration logic is here
          .order('created_at', { ascending: true });

        if (FOLLOW_ONLY_FEED) {
          const { data: follows } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);
          
          const followingIds = follows?.map(f => f.following_id) || [];
          statusQuery = statusQuery.in('user_id', [user.id, ...followingIds]);
        }

        const { data: statuses } = await statusQuery;
        if (!statuses) return;

        const usersMap = new Map<string, ProfileWithStatus>();

        for (const status of statuses) {
          if (!status.profiles) continue; 

          const userId = status.user_id;
          const statusWithViewers = {
              ...status,
              viewed_by: status.viewed_by || [] // Ensure viewed_by is an array
          };

          if (!usersMap.has(userId)) {
            usersMap.set(userId, {
              ...status.profiles,
              statuses: [statusWithViewers],
              hasUnseen: !statusWithViewers.viewed_by.includes(user.id) // NEW: Check unseen
            });
          } else {
            const userData = usersMap.get(userId)!;
            userData.statuses.push(statusWithViewers);
            // If any status is unseen, the whole user is unseen
            if (!statusWithViewers.viewed_by.includes(user.id)) {
                userData.hasUnseen = true;
            }
          }
        }
        
        const self = usersMap.get(user.id) || { ...profile, statuses: [], hasUnseen: false };
        if (self.statuses.length > 0) {
            // FIX: Your own 'hasUnseen' was bugged. This is now just for calculation.
            self.hasUnseen = self.statuses.some(s => !s.viewed_by.includes(user.id));
        }
        
        usersMap.delete(user.id);
        
        const others = Array.from(usersMap.values()).sort((a, b) => {
            // Sort by unseen first, then by time
            if (a.hasUnseen !== b.hasUnseen) {
                return a.hasUnseen ? -1 : 1; // Unseen users come first
            }
            const aLast = new Date(a.statuses[a.statuses.length - 1].created_at).getTime();
            const bLast = new Date(b.statuses[b.statuses.length - 1].created_at).getTime();
            return bLast - aLast; // Then sort by most recent
        });

        setOwnStatus(self);
        setStatusUsers(others);

      } catch (error) {
        console.error('Error fetching statuses:', error);
      }
    };

    fetchActiveStatuses();
    const sub = supabase.channel('status-tray-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'statuses' }, fetchActiveStatuses)
      .subscribe();
    
    const interval = setInterval(fetchActiveStatuses, 60000); // Refresh every 60s
    return () => {
      clearInterval(interval);
      supabase.removeChannel(sub);
    };
  }, [user, profile]);

  const openViewer = (initialUserId: string) => {
    if (!ownStatus) return;
    
    const fullQueue = [ownStatus, ...statusUsers];
    
    window.dispatchEvent(new CustomEvent('openStatusViewer', { 
      detail: { 
        initialUserId,
        users: fullQueue
      } 
    }));
  };

  const handleOwnClick = () => {
    if (ownStatus && ownStatus.statuses.length > 0) {
      openViewer(user!.id);
    } else {
      window.dispatchEvent(new CustomEvent('openStatusCreator'));
    }
  };
  
  const handleOwnPlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('openStatusCreator'));
  };

  if (!user) return null;

  // UPDATED: Ring rendering logic to include upload progress
  const renderRing = (user: ProfileWithStatus) => {
    const hasStatus = user.statuses.length > 0;
    
    if (user.id === profile?.id) {
        // --- OWN RING (Progress Bar / Existing Status / No Status) ---
        // 1. Progress Ring (for upload)
        if (uploadProgress !== null && uploadProgress < 100) {
            // Use conic gradient to simulate progress.
            return (
                <div 
                    className="absolute inset-0 rounded-full p-[2px] -z-10"
                    style={{
                        background: `conic-gradient(rgb(var(--color-primary)) ${uploadProgress}%, rgb(var(--color-border)) ${uploadProgress}%)`
                    }}
                />
            );
        }

        // 2. Existing Status Ring (Gray)
        if (hasStatus) {
            // Show a plain gray ring if you have a status (like IG)
            return <div className={`absolute inset-0 rounded-full p-[2px] -z-10 bg-[rgb(var(--color-border))]`} />
        } else {
            // 3. No Status Ring (Dashed)
            // No status: Dashed ring
            return <div className="absolute inset-0 rounded-full border-2 border-dashed border-[rgb(var(--color-border))] -z-10"/>
        }
    }
    
    // --- OTHERS' RINGS ---
    // Gradient if unseen, gray if seen
    return <div className={`absolute inset-0 rounded-full p-[2px] -z-10 ${user.hasUnseen ? 'bg-gradient-to-tr from-[rgb(var(--color-accent))] to-[rgb(var(--color-primary))] group-hover:scale-105 transition-transform' : 'bg-[rgb(var(--color-border))]'}`} />
  };

  return (
    <div className="flex space-x-4 p-4 overflow-x-auto scrollbar-hide bg-[rgb(var(--color-surface))] border-b border-[rgb(var(--color-border))]">
      {/* Own Circle */}
      {ownStatus && (
        <div 
          onClick={handleOwnClick}
          className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer group"
        >
          <div className="relative w-16 h-16 rounded-full">
            <img 
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`}
              className="w-full h-full rounded-full object-cover p-[2px] bg-[rgb(var(--color-surface))]"
              alt="Your avatar"
            />
            {renderRing(ownStatus)}
            
            <div 
              onClick={handleOwnPlusClick}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-[rgb(var(--color-primary))] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer border-2 border-[rgb(var(--color-surface))]"
            >
              <Plus size={16} className="text-[rgb(var(--color-text-on-primary))]" />
            </div>
          </div>
          <span className="text-xs text-center text-[rgb(var(--color-text-secondary))] truncate w-16">Your Status</span>
        </div>
      )}

      {/* Others' Circles */}
      {statusUsers.map((statusUser) => (
          <div 
            key={statusUser.id} 
            onClick={() => openViewer(statusUser.id)}
            className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer group"
          >
            <div className="relative w-16 h-16 rounded-full">
              <img 
                src={statusUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${statusUser.username}`}
                className="w-full h-full rounded-full object-cover p-[2px] bg-[rgb(var(--color-surface))]"
                alt={statusUser.display_name}
              />
              {renderRing(statusUser)}
            </div>
            <span className="text-xs text-center text-[rgb(var(--color-text-secondary))] truncate w-16 flex items-center justify-center gap-1">
              <span className="truncate">{statusUser.display_name || statusUser.username}</span>
              {statusUser.verified && <BadgeCheck size={12} className="text-[rgb(var(--color-accent))] flex-shrink-0" />}
            </span>
          </div>
        ))}
    </div>
  );
};


// =======================================================================
//  2. STATUS CREATOR
//  Massively upgraded with Camera and Video recording.
//  UPDATED: Added logic to dispatch upload progress events.
// =======================================================================
type CreatorMode = 'upload' | 'camera' | 'video' | 'gif'; // ADDED 'gif'

const StatusCreator: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  
  // Media State
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [remoteMediaUrl, setRemoteMediaUrl] = useState<string | null>(null); // ADDED: For GIFs/Remote
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [textOverlay, setTextOverlay] = useState('');
  
  // UI State
  const [isPosting, setIsPosting] = useState(false);
  const [mode, setMode] = useState<CreatorMode>('camera'); 
  const [isRecording, setIsRecording] = useState(false);

  // GIF State
  const [gifQuery, setGifQuery] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);

  // TENOR API SEARCH
  const searchGifs = async (query: string = '') => {
      const apiKey = import.meta.env.VITE_TENOR_API_KEY;
      if (!apiKey) return;
      const searchUrl = query 
        ? `https://tenor.googleapis.com/v2/search?q=${query}&key=${apiKey}&client_key=gazebo_app&limit=12&media_filter=minimal`
        : `https://tenor.googleapis.com/v2/featured?key=${apiKey}&client_key=gazebo_app&limit=12&media_filter=minimal`;
      
      try {
          const res = await fetch(searchUrl);
          const data = await res.json();
          setGifs(data.results || []);
      } catch (e) {
          console.error("Tenor Error", e);
      }
  };

  useEffect(() => {
    if (mode === 'gif') searchGifs(gifQuery);
  }, [mode, gifQuery]);
  
  // Camera/Mic Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Utility Functions ---

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Clean up Object URLs and streams
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (mediaPreviewUrl) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  // --- Camera/Video Logic ---

  const startCamera = useCallback(async () => {
    stopCameraStream(); // Stop any existing stream
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Camera is not supported on your device.");
      setMode('upload');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: mode === 'video', // Only request audio if in video mode
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
      setMode('upload');
    }
  }, [facingMode, mode]);

  // Start camera when mode changes to 'camera' or 'video'
  useEffect(() => {
    if (mode === 'camera' || mode === 'video') {
      if (!mediaFile) {
          startCamera();
      }
    } else {
      stopCameraStream();
    }
    
    // Cleanup on mode change
    return () => stopCameraStream();
  }, [mode, startCamera, mediaFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert("Only image and video files are allowed.");
        return;
    }
    
    setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
    setMediaFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    stopCameraStream(); // We have a file, stop the camera
  };

  const takePicture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        setMediaFile(new File([blob], 'status.jpg', { type: 'image/jpeg' }));
        setMediaPreviewUrl(URL.createObjectURL(blob));
        setMediaType('image');
        stopCameraStream();
      }
    }, 'image/jpeg');
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) return;
    
    setIsRecording(true);
    audioChunksRef.current = [];
    
    // --- FIX: Prioritize 'video/mp4' for Safari/iOS support ---
    const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : 'video/webm';
    const fileExtension = mimeType.split('/')[1] || 'webm';

    mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, {
        mimeType: mimeType
    });
    
    mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
    };
    
    mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setMediaFile(new File([blob], `status.${fileExtension}`, { type: mimeType }));
        setMediaPreviewUrl(URL.createObjectURL(blob));
        setMediaType('video');
        setIsRecording(false);
        stopCameraStream();
    };
    
    mediaRecorderRef.current.start();
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    // The useEffect[facingMode] will handle restarting the camera
  };

  // --- Posting Logic ---
  const handlePost = async () => {
    // Check for either File OR Remote URL
    if (!user || (!mediaFile && !remoteMediaUrl)) return;

    setIsPosting(true);
    // Dispatch start
    window.dispatchEvent(new CustomEvent('statusUploadProgress', { detail: { progress: 1 } }));
    let progress = 1;

    // Simulate progress
    const mockProgress = () => {
        progress = Math.min(progress + 10, 95); 
        window.dispatchEvent(new CustomEvent('statusUploadProgress', { detail: { progress: progress } }));
        if (progress < 95) {
            setTimeout(mockProgress, 300);
        }
    };
    const progressTimeout = setTimeout(mockProgress, 300);

    try {
      let finalMediaUrl = remoteMediaUrl;

      // Only upload if we have a file
      if (mediaFile) {
          const uploadResult = await uploadStatusMedia(mediaFile);
          if (!uploadResult) throw new Error('Upload failed.');
          finalMediaUrl = uploadResult.url;
      }
      
      if (!finalMediaUrl) throw new Error('No media URL generated.');

      // Stop mock progress
      clearTimeout(progressTimeout); 
      progress = 99;
      window.dispatchEvent(new CustomEvent('statusUploadProgress', { detail: { progress: progress } }));

      // Expiry: 24 hours
      const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await supabase
        .from('statuses')
        .insert({
          user_id: user.id,
          media_url: finalMediaUrl,
          media_type: mediaType,
          text_overlay: textOverlay ? { 
            text: textOverlay, 
            // UPDATED: Default position to bottom (Caption style)
            x: 50, 
            y: 85, 
            color: 'white',
            fontSize: 12
          } : {},
          expires_at: expires_at
        });
      
      window.dispatchEvent(new CustomEvent('statusUploadProgress', { detail: { progress: 100 } }));
      onClose();
    } catch (error) {
      console.error('Error posting status:', error);
      alert('Failed to post status.');
      window.dispatchEvent(new CustomEvent('statusUploadProgress', { detail: { progress: null } }));
    } finally {
      setIsPosting(false);
    }
  };

  const reset = () => {
    setMediaFile(null);
    setRemoteMediaUrl(null);
    setMediaPreviewUrl('');
    setTextOverlay('');
    setGifQuery(''); // Reset query
    if (mode === 'gif') searchGifs(''); // Reset GIF grid
    startCamera();
  };

  // --- Render ---

 const hasMedia = !!(mediaFile || remoteMediaUrl);

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="relative w-full h-full max-w-lg max-h-screen bg-black rounded-lg overflow-hidden flex flex-col">
        
        {/* Header Bar */}
        <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
          <button 
            onClick={hasMedia ? reset : onClose} 
            className="p-2 bg-black/50 rounded-full text-white backdrop-blur-md"
          >
            <X size={24} />
          </button>
          
          {hasMedia && (
             <button 
              onClick={handlePost}
              disabled={isPosting}
              className="px-4 py-2 bg-[rgb(var(--color-primary))] text-[rgb(var(--color-text-on-primary))] rounded-full font-bold text-sm flex items-center gap-2 disabled:opacity-50 shadow-lg"
            >
              {isPosting ? 'Posting...' : 'Share'}
              {!isPosting && <Send size={16} />}
            </button>
          )}
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 relative w-full h-full overflow-hidden bg-[#1a1a1a]">
            
            {/* 1. PREVIEW MODE (File or GIF selected) */}
            {hasMedia && (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center z-10 bg-black">
                {mediaType === 'image' && (
                // UPDATED: Universal proportional centering
                <img 
                    src={mediaPreviewUrl} 
                    className="w-full h-full object-contain" 
                    alt="Preview" 
                />
                )}
                {mediaType === 'video' && (
                <video src={mediaPreviewUrl} className="w-full h-full object-contain" autoPlay muted loop playsInline />
                )}
                
                {/* Text Overlay Input */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-end pb-20">
                    <input
                        type="text"
                        value={textOverlay}
                        onChange={(e) => setTextOverlay(e.target.value)}
                        placeholder="Add a caption..."
                        className="w-full text-center bg-black/40 text-white text-xl font-medium p-3 outline-none border-none pointer-events-auto backdrop-blur-sm"
                        style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
                    />
                </div>
            </div>
            )}

            {/* 2. CAPTURE/SELECT MODES */}
            {!hasMedia && (
            <div className="w-full h-full flex flex-col items-center justify-center z-0 relative">
                
                {/* Camera View */}
                {(mode === 'camera' || mode === 'video') && (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                )}
                
                {/* Upload View */}
                {mode === 'upload' && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-4 text-center">
                        <div className="w-20 h-20 bg-[rgb(var(--color-surface-hover))] rounded-full flex items-center justify-center mb-2">
                            <ImageIcon size={40} className="text-[rgb(var(--color-text-secondary))]" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Gallery</h2>
                        <p className="text-gray-400 max-w-xs">Share photos and videos from your device.</p>
                        <button onClick={() => fileInputRef.current?.click()} className="mt-4 px-8 py-3 bg-[rgb(var(--color-primary))] text-white rounded-full font-bold shadow-lg transform active:scale-95 transition">
                            Select Media
                        </button>
                    </div>
                )}

                {/* GIF Mode View */}
                {mode === 'gif' && (
                    <div className="w-full h-full flex flex-col bg-[rgb(var(--color-surface))] pt-20 pb-32">
                        <div className="px-4 mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    value={gifQuery}
                                    onChange={e => setGifQuery(e.target.value)}
                                    placeholder="Search Tenor GIFs..."
                                    className="w-full pl-10 pr-4 py-3 bg-[rgb(var(--color-background))] rounded-xl text-white outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))]"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2">
                            <div className="grid grid-cols-2 gap-2 pb-4">
                                {gifs.map(gif => (
                                    <button 
                                        key={gif.id}
                                        onClick={() => {
                                            setRemoteMediaUrl(gif.media_formats.gif.url);
                                            setMediaPreviewUrl(gif.media_formats.gif.url); // Use same URL for preview
                                            setMediaType('image'); // Treat GIF as image
                                            // Mode stays 'gif' implicitly until hasMedia toggles render
                                        }}
                                        className="relative aspect-square rounded-lg overflow-hidden bg-gray-800"
                                    >
                                        <img src={gif.media_formats.tinygif.url} className="w-full h-full object-cover" loading="lazy" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            )}
        </div>

        {/* Footer Controls (Only show if no media selected) */}
        {!hasMedia && (
            <div className="absolute bottom-0 left-0 w-full z-20 flex flex-col items-center bg-gradient-to-t from-black/80 via-black/40 to-transparent pb-8 pt-12">
                
                {/* Shutter Button Row - SHIFTED HIGHER */}
                <div className="flex items-center justify-center w-full mb-8 relative px-6">
                    {/* Left: Flip (Camera modes only) */}
                    <div className="flex-1 flex justify-start">
                        {(mode === 'camera' || mode === 'video') && (
                            <button onClick={toggleFacingMode} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition">
                                <RefreshCcw size={24} />
                            </button>
                        )}
                    </div>

                    {/* Center: Shutter */}
                    <div className="flex-0 mx-4">
                        {mode === 'camera' && (
                            <button onClick={takePicture} className="w-20 h-20 rounded-full bg-white border-4 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.3)] transform active:scale-90 transition-transform" />
                        )}
                        {mode === 'video' && (
                            <button onClick={isRecording ? stopRecording : startRecording} className={`w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center transform active:scale-95 transition-all ${isRecording ? 'bg-transparent border-red-500' : 'bg-red-500'}`}>
                                {isRecording ? <div className="w-8 h-8 bg-red-500 rounded-md animate-pulse" /> : null}
                            </button>
                        )}
                        {(mode === 'upload' || mode === 'gif') && (
                            <div className="w-20 h-20" /> /* Spacer to keep layout stable */
                        )}
                    </div>

                    {/* Right: Spacer */}
                    <div className="flex-1" />
                </div>
                
                {/* Mode Toggles - Bottom Row */}
                <div className="flex gap-6 text-sm font-bold uppercase tracking-wider overflow-x-auto max-w-full px-4 no-scrollbar items-center justify-center pb-2">
                    <button onClick={() => setMode('upload')} className={`transition-colors whitespace-nowrap px-2 py-1 ${mode === 'upload' ? 'text-[rgb(var(--color-primary))]' : 'text-gray-400 hover:text-white'}`}>Gallery</button>
                    <button onClick={() => setMode('gif')} className={`transition-colors whitespace-nowrap px-2 py-1 ${mode === 'gif' ? 'text-[rgb(var(--color-primary))]' : 'text-gray-400 hover:text-white'}`}>GIF</button>
                    <button onClick={() => setMode('camera')} className={`transition-colors whitespace-nowrap px-2 py-1 ${mode === 'camera' ? 'text-[rgb(var(--color-primary))]' : 'text-gray-400 hover:text-white'}`}>Photo</button>
                    <button onClick={() => setMode('video')} className={`transition-colors whitespace-nowrap px-2 py-1 ${mode === 'video' ? 'text-[rgb(var(--color-primary))]' : 'text-gray-400 hover:text-white'}`}>Video</button>
                </div>

                <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*,video/*" 
                    onChange={handleFileSelect} 
                    className="hidden" 
                />
            </div>
        )}

        {/* Loading Overlay */}
        {isPosting && (
            <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                <div className="w-10 h-10 border-4 border-[rgb(var(--color-primary))] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-white font-bold animate-pulse">Sharing Status...</span>
            </div>
        )}
      </div>
    </div>
  );
};

// =======================================================================
//  3. STATUS VIEWER (AND SUB-COMPONENTS)
//  Upgraded with "Viewed by" list, profile nav, and DM replies.
//  FIXED: Image centering and audio.
// =======================================================================

// --- NEW: Time Ago Helper Function ---
const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return `${diffInSeconds}s ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        const minutes = diffInMinutes % 60;
        if (minutes > 0) {
             return `${diffInHours}h ${minutes}m ago`;
        }
        return `${diffInHours}h ago`;
    }
    
    // Fallback for > 24h, though statuses should expire
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
};

// --- NEW, ROBUST StoryProgressBar ---
const StoryProgressBar: React.FC<{
  duration: number;
  isActive: boolean;
  isPaused: boolean;
  onFinished: () => void;
}> = ({ duration, isActive, isPaused, onFinished }) => {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const accumulatedPauseDurationRef = useRef<number>(0);
  const lastPauseTimeRef = useRef<number>(0);

  // Effect to reset or fill the bar based on active state
  useEffect(() => {
    if (isActive) {
      setProgress(0);
      startTimeRef.current = Date.now();
      accumulatedPauseDurationRef.current = 0;
      lastPauseTimeRef.current = 0;
    } else {
      // If we are navigating away, check progress.
      // If not 100, reset to 0. If 100, keep it 100.
      setProgress(p => p < 100 ? 0 : 100);
    }
  }, [isActive]);

  // Effect to handle pausing
  useEffect(() => {
    if (!isActive) return;

    if (isPaused) {
      // We just paused
      if (lastPauseTimeRef.current === 0) { // Only set if not already set
        lastPauseTimeRef.current = Date.now();
      }
    } else {
      // We just unpaused
      if (lastPauseTimeRef.current > 0) {
        accumulatedPauseDurationRef.current += (Date.now() - lastPauseTimeRef.current);
        lastPauseTimeRef.current = 0;
      }
    }
  }, [isPaused, isActive]);

  // Effect for the animation loop
  useEffect(() => {
    if (!isActive || isPaused || duration === 0) return;

    let frameId: number;

    const animate = () => {
      const now = Date.now();
      const elapsedTime = now - startTimeRef.current - accumulatedPauseDurationRef.current;
      const newProgress = (elapsedTime / duration) * 100;

      if (newProgress >= 100) {
        setProgress(100);
        onFinished();
      } else {
        setProgress(newProgress);
        frameId = requestAnimationFrame(animate);
      }
    };
    
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isActive, isPaused, duration, onFinished]); // Runs when unpaused

  // If not active, show 0% unless it's already finished (100%)
  const displayProgress = !isActive && progress < 100 ? 0 : progress;

  return (
    <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
      <div 
        className="h-full bg-white"
        style={{ 
            width: `${displayProgress}%`,
            // Use a tiny transition to smooth out the raf updates
            transition: (displayProgress > 0 && displayProgress < 100) ? 'width 50ms linear' : 'none'
        }} 
      />
    </div>
  );
};


/**
 * NEW: Modal to show who viewed a status
 */
const StatusViewersModal: React.FC<{
  statusId: string;
  onClose: () => void;
  onGoToProfile: (profileId: string) => void;
}> = ({ statusId, onClose, onGoToProfile }) => {
    const [viewers, setViewers] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchViewers = async () => {
            setIsLoading(true);
            try {
                // Get the list of UUIDs who viewed
                const { data: statusData, error: statusError } = await supabase
                    .from('statuses')
                    .select('viewed_by')
                    .eq('id', statusId)
                    .single();
                
                if (statusError || !statusData || !statusData.viewed_by || statusData.viewed_by.length === 0) {
                    setIsLoading(false);
                    return;
                }
                
                // Get the profiles for those UUIDs
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', statusData.viewed_by);
                
                if (profilesError) throw profilesError;
                
                setViewers(profilesData || []);
            } catch (error) {
                console.error("Error fetching viewers:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchViewers();
    }, [statusId]);

    return (
        <div 
          className="fixed inset-0 bg-black/60 z-[1001] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div 
            className="bg-[rgb(var(--color-surface))] w-full max-w-md rounded-2xl max-h-[70vh] flex flex-col shadow-2xl border border-[rgb(var(--color-border))]" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[rgb(var(--color-border))] flex items-center justify-between">
              <h3 className="font-bold text-lg text-[rgb(var(--color-text))]">Viewed By</h3>
              <button onClick={onClose} className="p-1 hover:bg-[rgb(var(--color-surface-hover))] rounded-full">
                <X size={20} className="text-[rgb(var(--color-text))]" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              {isLoading && (
                <div className="text-center p-4 text-[rgb(var(--color-text-secondary))]">Loading...</div>
              )}
              {!isLoading && viewers.length === 0 && (
                 <p className="text-center text-[rgb(var(--color-text-secondary))]">No views yet.</p>
              )}
              {viewers.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img 
                        src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                        className="w-10 h-10 rounded-full cursor-pointer"
                        alt="Avatar"
                        onClick={() => onGoToProfile(profile.id)}
                        />
                        <div>
                        <button onClick={() => onGoToProfile(profile.id)} className="font-bold hover:underline text-[rgb(var(--color-text))] text-sm block">
                            {profile.display_name}
                            {profile.verified && <BadgeCheck size={14} className="inline ml-1 text-[rgb(var(--color-accent))]" />}
                        </button>
                        <span className="text-sm text-[rgb(var(--color-text-secondary))]">@{profile.username}</span>
                        </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
    );
};


/**
 * The Main Story Viewer Component
 */
const StatusViewer: React.FC<{
  allStatusUsers: ProfileWithStatus[];
  initialUserId: string;
  onClose: () => void;
}> = ({ allStatusUsers, initialUserId, onClose }) => {
  const { user } = useAuth();
  
  const [currentUserIndex, setCurrentUserIndex] = useState(() => 
    Math.max(0, allStatusUsers.findIndex(u => u.id === initialUserId))
  );
  
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isReplyInputFocused, setIsReplyInputFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // NEW: Reply and Viewer state
  const [replyContent, setReplyContent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0); // <-- NEW: For video duration

  const videoRef = useRef<HTMLVideoElement>(null);
  const currentUser = allStatusUsers[currentUserIndex];
  const currentStory = currentUser?.statuses?.[currentStoryIndex];
  
  // --- Navigation Logic ---

  const goToNextUser = useCallback(() => {
    if (currentUserIndex < allStatusUsers.length - 1) {
      setCurrentUserIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
      setIsLoading(true);
    } else {
      onClose();
    }
  }, [currentUserIndex, allStatusUsers.length, onClose]);

  const goToNextStory = useCallback(() => {
    if (currentUser && currentStoryIndex < currentUser.statuses.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      goToNextUser();
    }
  }, [currentStoryIndex, currentUser, goToNextUser]);

  const goToPrevUser = () => {
    if (currentUserIndex > 0) {
      setCurrentUserIndex(prev => prev - 1);
      setCurrentStoryIndex(0); // Start at first story of prev user
      setIsLoading(true);
    }
  };

  const goToPrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else {
      goToPrevUser();
    }
  };
  
  // --- Media Loading and View Marking ---
  
  useEffect(() => {
    if (!currentStory || !user) return;
    
    setIsLoading(true);
    
    // 1. Mark as viewed (FIXED: Now uses RPC)
    const markAsViewed = async () => {
        // Don't mark own stories as viewed
        if (currentStory.user_id === user.id) return;
        
        // Optimistic client-side update to stop re-triggering
        const viewedBy = currentStory.viewed_by || [];
        if (viewedBy.includes(user.id)) return;
        
        currentStory.viewed_by.push(user.id); // Mutate local copy
        
        // Fire-and-forget DB update using RPC
        await supabase.rpc('mark_status_viewed', {
            status_id: currentStory.id,
            viewer_id: user.id
        });
    };
    
    markAsViewed();

    // 2. Load media
    const mediaUrl = currentStory.media_url;
    if (currentStory.media_type === 'image') {
      const img = new Image();
      img.src = mediaUrl;
      img.onload = () => setIsLoading(false);
      img.onerror = () => goToNextStory(); // Skip broken
    } else if (currentStory.media_type === 'video') {
      if (videoRef.current) {
        videoRef.current.src = mediaUrl;
        videoRef.current.load();
        setVideoDuration(0); // <-- NEW: Reset duration
      }
    }
  }, [currentStory, user, goToNextStory]);
  
  // Video playback
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
        if (isPaused || isLoading) {
            video.pause();
        } else {
            video.play().catch(() => {}); // Ignore play errors
        }
    }
  }, [isPaused, isLoading, currentStory]);

  // --- Input Handlers ---
  const handlePointerDown = () => setIsPaused(true);
  const handlePointerUp = () => setIsPaused(false);

  const handleClickNavigation = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickThreshold = rect.width * 0.3;
    
    if (clickX < clickThreshold) goToPrevStory();
    else goToNextStory();
  };

  const handleGoToProfile = (profileId: string) => {
    onClose(); // Close viewer first
    setShowViewers(false); // Close modal if open
    window.dispatchEvent(new CustomEvent('navigateToProfile', { detail: profileId }));
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !user || !currentStory || !currentUser) return;
    
    setIsSendingReply(true);
    setIsPaused(true); // Pause while sending
    
    try {
        await supabase.from('messages').insert({
            sender_id: user.id,
            recipient_id: currentUser.id,
            content: replyContent,
            // Add media from the story to mimic IG replies
            media_url: currentStory.media_url,
            media_type: currentStory.media_type
        });
        
        setReplyContent('');
        // Show "Sent" feedback
        setTimeout(() => {
            setIsSendingReply(false);
            setIsPaused(false); // Resume
        }, 1000);
        
    } catch (error) {
        console.error("Error sending reply:", error);
        setIsSendingReply(false);
        setIsPaused(false);
    }
  };


  if (!currentUser || !currentStory) {
    return (
        <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
  }

  const overlay = currentStory.text_overlay as any;
  const isOwnStory = currentUser.id === user?.id;

  return (
    <Fragment>
    <div 
      className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="absolute inset-0 z-20" onClick={handleClickNavigation} />
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full p-3 z-30">
        {/* Progress Bars */}
        <div className="flex space-x-1 mb-2">
          {currentUser.statuses.map((story, idx) => (
            <StoryProgressBar
              key={story.id}
              duration={ // <-- UPDATED to use videoDuration
                story.media_type === 'image' 
                  ? 5000 
                  : (idx === currentStoryIndex ? videoDuration : 0)
              } 
              isActive={idx === currentStoryIndex}
              isPaused={isPaused || isLoading || isReplyInputFocused}
              onFinished={goToNextStory} // <-- UPDATED to be universal
            />
          ))}
        </div>
        
        {/* User Info */}
        <button 
            onClick={() => handleGoToProfile(currentUser.id)}
            className="flex items-center gap-3 group"
        >
          <img 
            src={currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`}
            className="w-10 h-10 rounded-full group-hover:opacity-80 transition"
            alt={currentUser.display_name}
          />
          <div className="flex items-center gap-2"> {/* <-- WRAP this */}
            <div className="flex flex-col items-start">
              <span className="text-white font-bold text-sm group-hover:underline flex items-center gap-1">
                {currentUser.display_name}
                {currentUser.verified && <BadgeCheck size={14} className="text-white" />}
              </span>
              <span className="text-white/70 text-xs">@{currentUser.username}</span>
            </div>
            {/* --- ADDED Time Ago --- */}
            <span className="text-white/70 text-xs">
                {formatTimeAgo(currentStory.created_at)}
            </span>
          </div>
        </button>
      </div>
      
      <button onClick={onClose} className="absolute top-4 right-4 z-40 text-white p-2 bg-black/30 rounded-full">
        <X size={24} />
      </button>

      {/* Media Content */}
      <div className="relative flex-1 w-full h-full max-w-lg max-h-screen flex items-center justify-center overflow-hidden bg-black">
        {isLoading && (
           <div className="p-4 flex flex-col items-center justify-center border-b border-[rgb(var(--color-border))]">
            <div className="logo-loading-container w-[50px] h-auto relative">
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
        
        {/* Status Viewer */}
        <img 
          src={currentStory.media_type === 'image' ? currentStory.media_url : ''} 
          className={`w-full h-full object-contain mx-auto block transition-opacity ${currentStory.media_type === 'image' ? 'opacity-100' : 'opacity-0'}`} 
          style={{ display: currentStory.media_type === 'image' ? 'block' : 'none' }}
          alt="image not loaded" 
        />
        
        <video
          ref={videoRef}
          className={`w-full h-full object-contain mx-auto block transition-opacity ${currentStory.media_type === 'video' ? 'opacity-100' : 'opacity-0'}`}
          style={{ display: currentStory.media_type === 'video' ? 'block' : 'none' }} 
          playsInline
          onEnded={goToNextStory} 
          onLoadedMetadata={(e) => { 
            setIsLoading(false); 
            setVideoDuration(e.currentTarget.duration * 1000);
          }}
          onCanPlay={() => { 
             setIsLoading(false);
             if (videoRef.current && videoDuration === 0) { 
                setVideoDuration(videoRef.current.duration * 1000);
             }
          }}
          onError={() => goToNextStory()}
        />

        {overlay.text && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-end pb-20 z-30">
            <div 
                className="w-full text-center bg-black/40 text-white text-xl font-medium p-3 backdrop-blur-sm"
                style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
            >
              {overlay.text}
            </div>
          </div>
        )}
      </div>

      {/* Reply Bar / Viewers Button */}
      {isOwnStory ? (
        <div className="absolute bottom-0 left-0 w-full p-4 z-30">
           <button 
             onClick={() => setShowViewers(true)}
             className="flex items-center gap-2 px-4 py-2 bg-black/50 rounded-full text-white text-sm"
            >
              <Eye size={16} />
              Viewed by {currentStory.viewed_by?.length || 0}
           </button>
        </div>
      ) : (
        <form onSubmit={handleSendReply} className="absolute bottom-0 left-0 w-full p-4 z-30">
          <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onFocus={() => setIsReplyInputFocused(true)}
                onBlur={() => setIsReplyInputFocused(false)}
                placeholder={`Reply to ${currentUser.display_name}...`} 
                className="flex-1 p-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/70 outline-none text-sm"
                onClick={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
              />
             <button 
                type="submit"
                disabled={isSendingReply || !replyContent.trim()}
                className="p-3 rounded-full text-white bg-white/20 disabled:opacity-50"
             >
                {isSendingReply ? <Check size={20} /> : <Send size={20} />}
            </button>
          </div>
        </form>
      )}
    </div>
    
    {/* Viewers Modal */}
    {showViewers && isOwnStory && (
        <StatusViewersModal
            statusId={currentStory.id}
            onClose={() => setShowViewers(false)}
            onGoToProfile={handleGoToProfile}
        />
    )}
    </Fragment>
  );
};

// =======================================================================
//  4. STATUS ARCHIVE
// =======================================================================
export const StatusArchive: React.FC = () => {
  const { user } = useAuth();
  const [allStatuses, setAllStatuses] = useState<StatusType[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusType | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      try {
        const { data } = await supabase
          .from('statuses')
          .select('*, profiles!user_id(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setAllStatuses(data || []);
      } catch (error) {
        console.error('Error fetching archive:', error);
      }
    };
    fetchAll();
  }, [user]);

  const openArchiveViewer = (status: StatusType) => setSelectedStatus(status);

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
            {status.media_type === 'image' ? (
              <img src={status.media_url} className="w-full aspect-square object-cover rounded" alt="Archive" />
            ) : (
              <video src={status.media_url} className="w-full aspect-square object-cover rounded" muted />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-end p-2 rounded transition-opacity">
              <span className="text-white text-sm truncate">{new Date(status.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedStatus && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedStatus(null)}>
          <div className="relative w-full max-w-md" onClick={e => e.stopPropagation()}>
            {selectedStatus.media_type === 'image' ? (
              <img src={selectedStatus.media_url} className="w-full rounded" alt="Full" />
            ) : (
              <video src={selectedStatus.media_url} className="w-full rounded" controls autoPlay muted playsInline />
            )}
            <button onClick={() => setSelectedStatus(null)} className="absolute -top-10 right-0 text-white p-2"><X size={24} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

// =======================================================================
//  5. GLOBAL MODAL CONTAINER
// =======================================================================
export const Status: React.FC = () => {
  const [showCreator, setShowCreator] = useState(false);
  
  const [viewerData, setViewerData] = useState<{
    users: ProfileWithStatus[];
    initialUserId: string;
  } | null>(null);

  useEffect(() => {
    const handleOpenCreator = () => setShowCreator(true);
    
    const handleOpenViewer = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.users && detail.initialUserId) {
        setViewerData({
          users: detail.users,
          initialUserId: detail.initialUserId
        });
      }
    };

    window.addEventListener('openStatusCreator', handleOpenCreator);
    window.addEventListener('openStatusViewer', handleOpenViewer);

    return () => {
      window.removeEventListener('openStatusCreator', handleOpenCreator);
      window.removeEventListener('openStatusViewer', handleOpenViewer);
    };
  }, []);

  return (
    <Fragment>
      {showCreator && <StatusCreator onClose={() => setShowCreator(false)} />}
      
      {viewerData && (
        <StatusViewer
          allStatusUsers={viewerData.users}
          initialUserId={viewerData.initialUserId}
          onClose={() => setViewerData(null)}
        />
      )}
    </Fragment>
  );
};
