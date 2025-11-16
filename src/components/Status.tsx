// src/components/Status.tsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase, uploadStatusMedia, Profile, Status } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus, Camera, Video, Image as ImageIcon, Edit3, ChevronLeft, ChevronRight, Clock, Archive, Home } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const FOLLOW_ONLY_FEED = import.meta.env.VITE_FOLLOW_ONLY_FEED === 'true';

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

// StatusTray Component
export const StatusTray: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeStatuses, setActiveStatuses] = useState<{ [key: string]: Status }>({});
  const [ownStatus, setOwnStatus] = useState<Status | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchActiveStatuses = async () => {
      try {
        let query = supabase
          .from('statuses')
          .select('*, profiles!user_id(*)')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(50);

        // If follow-only, filter by follows (assuming a 'follows' table exists; adjust if needed)
        if (FOLLOW_ONLY_FEED) {
          // Placeholder: fetch follows and filter in JS or use RPC
          let followIds: string[] = [];
          try {
            const { data: follows } = await supabase.from('follows').select('followed_id').eq('follower_id', user.id);  // Assume follows table
            followIds = follows?.map(f => f.followed_id) || [];
          } catch (followError) {
            console.warn('Follows table not found or error fetching follows:', followError);
            followIds = [];
          }
          query = query.in('user_id', [user.id, ...followIds]);
        }

        const { data } = await query;
        if (!data) return;

        // Group by user_id, take latest per user
        const grouped: { [key: string]: Status } = {};
        data.forEach((status: Status) => {
          if (!grouped[status.user_id] || new Date(status.created_at) > new Date(grouped[status.user_id].created_at)) {
            grouped[status.user_id] = status;
          }
        });

        setActiveStatuses(grouped);

        // Ensure own is always tracked
        const own = grouped[user.id] || null;
        setOwnStatus(own);
      } catch (error) {
        console.error('Error fetching statuses:', error);
      }
    };

    fetchActiveStatuses();
    const interval = setInterval(fetchActiveStatuses, 30000);  // Refresh every 30s
    return () => clearInterval(interval);
  }, [user]);

  const handleOwnAvatarClick = () => {
    if (ownStatus) {
      window.dispatchEvent(new CustomEvent('openStatusViewer', { detail: { userId: user.id } }));
    } else {
      window.dispatchEvent(new CustomEvent('openStatusCreator'));
    }
  };

  const handleOwnPlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('openStatusCreator'));
  };

  const handleOtherClick = (statusUserId: string) => {
    navigate(`/?status=${statusUserId}`);  // Or set global state
    window.dispatchEvent(new CustomEvent('openStatusViewer', { detail: { userId: statusUserId } }));
  };

  return (
    <div className="flex space-x-4 p-4 overflow-x-auto scrollbar-hide bg-[rgb(var(--color-surface))] border-b border-[rgb(var(--color-border))]">
      {/* Own Circle */}
      <div className="flex flex-col items-center space-y-1 flex-shrink-0">
        <div 
          onClick={handleOwnAvatarClick}
          className="relative w-16 h-16 rounded-full border-2 border-dashed cursor-pointer group"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <img 
            src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`}
            className="w-full h-full rounded-full object-cover"
            alt="Your avatar"
          />
          <div 
            onClick={handleOwnPlusClick}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-[rgb(var(--color-primary))] rounded-full flex items-center justify-center group-hover:scale-110 transition cursor-pointer"
          >
            <Plus size={12} className="text-white" />
          </div>
          {ownStatus && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id={`own-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(var(--color-primary))" />
                  <stop offset="100%" stopColor="rgb(var(--color-accent))" />
                </linearGradient>
              </defs>
              <circle cx="50%" cy="50%" r="50%" fill="none" stroke="url(#own-grad)" strokeWidth="2" />
            </svg>
          )}
        </div>
        <span className="text-xs text-center text-[rgb(var(--color-text-secondary))] truncate w-16">Your Status</span>
      </div>

      {/* Others' Circles */}
      {Object.values(activeStatuses)
        .filter(s => s.user_id !== user?.id)
        .map((status) => (
          <div key={status.user_id} className="flex flex-col items-center space-y-1 flex-shrink-0">
            <div 
              onClick={() => handleOtherClick(status.user_id)}
              className="relative w-16 h-16 rounded-full cursor-pointer"
            >
              <img 
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
                <circle cx="50%" cy="50%" r="50%" fill="none" stroke="url(#grad-${status.user_id})" strokeWidth="2" />
              </svg>
            </div>
            <span className="text-xs text-center text-[rgb(var(--color-text-secondary))] truncate w-16">
              {status.profiles?.display_name || status.profiles?.username}
            </span>
          </div>
        ))}
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
          ctx?.drawImage(videoRef.current, 0, 0);
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
      setDragOffset({
        x: e.clientX - rect.left - textOverlay.x,
        y: e.clientY - rect.top - textOverlay.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !editorRef.current) return;
    const rect = editorRef.current.getBoundingClientRect();
    setTextOverlay(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100)),
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Post status
  const handlePost = async () => {
    if (!user || !mediaBlob) return;

    try {
      // Convert Blob to File if necessary to ensure .name exists
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
          user_id: user.id,
          media_url: uploadResult.url,
          media_type: mediaType,
          text_overlay: textOverlay.text ? textOverlay : {},
        });

      if (error) {
        console.error('Insert error:', error);
        alert('Failed to post status. Please try again.');
        return;
      }

      onClose();
      setStep('capture');
      setMediaBlob(null);
      setTextOverlay({ text: '', x: 50, y: 50, fontSize: 24, color: 'white' });
    } catch (error) {
      console.error('Post error:', error);
      alert('An error occurred while posting your status.');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center p-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div className="bg-[rgb(var(--color-surface))] rounded-2xl p-4 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-2 right-2 p-1 hover:bg-[rgb(var(--color-surface-hover))]">
          <X size={20} />
        </button>

        {step === 'capture' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-center">Create Status</h2>
            <video ref={videoRef} className="w-full h-48 object-cover rounded" autoPlay muted />
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
            <h2 className="text-lg font-bold text-center">Edit Status</h2>
            <div ref={editorRef} className="relative w-full h-64 bg-black rounded overflow-hidden cursor-move" style={{ position: 'relative' }}>
              {mediaType === 'image' && mediaBlob && (
                <img src={URL.createObjectURL(mediaBlob)} className="w-full h-full object-cover" alt="Preview" />
              )}
              {mediaType === 'video' && mediaBlob && (
                <video src={URL.createObjectURL(mediaBlob)} className="w-full h-full object-cover" controls muted />
              )}
              {textOverlay.text && (
                <div
                  className="absolute select-none pointer-events-none bg-black/50 text-white p-2 rounded"
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
              className="w-full p-2 border border-[rgb(var(--color-border))] rounded"
            />
            <div className="flex space-x-2 text-sm">
              <button onClick={() => setTextOverlay(prev => ({ ...prev, fontSize: prev.fontSize + 4 }))}><Edit3 size={16} /></button>
              <input type="color" value={textOverlay.color} onChange={(e) => setTextOverlay(prev => ({ ...prev, color: e.target.value }))} className="w-8 h-8" />
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
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showText, setShowText] = useState(true);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const { data } = await supabase
          .from('statuses')
          .select('*, profiles!user_id(*)')
          .eq('user_id', userId)
          .gt('expires_at', new Date().toISOString())  // Active only
          .order('created_at', { ascending: true });
        setStatuses(data || []);
        if (data && data.length > 0) setCurrentIndex(0);
      } catch (error) {
        console.error('Error fetching statuses for viewer:', error);
      }
    };
    fetchStatuses();
  }, [userId]);

  useEffect(() => {
    if (statuses.length === 0 || paused) return;

    if (statuses[currentIndex].media_type === 'image') {
      timerRef.current = setTimeout(() => {
        if (currentIndex < statuses.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          onClose();
        }
      }, 5000); // 5s for images
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, statuses, paused, onClose]);

  const handleTouchStart = () => setPaused(true);
  const handleTouchEnd = () => setPaused(false);

  const handlePrev = () => setCurrentIndex(Math.max(0, currentIndex - 1));
  const handleNext = () => setCurrentIndex(Math.min(statuses.length - 1, currentIndex + 1));

  if (statuses.length === 0) return null;

  const current = statuses[currentIndex];
  const overlay = current.text_overlay as any;

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Progress Bars */}
      <div className="flex space-x-2 p-2 absolute top-0 left-0 w-full z-10">
        {statuses.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full">
            <div className={`h-full bg-white rounded-full transition-all ${idx < currentIndex ? 'w-full' : idx === currentIndex && !paused ? 'animate-progress' : 'w-0'}`} />
          </div>
        ))}
      </div>

      {/* User Info */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <img 
          src={current.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${current.profiles?.username}`}
          className="w-8 h-8 rounded-full"
          alt={current.profiles?.display_name}
        />
        <span className="text-white font-bold">{current.profiles?.display_name}</span>
        <span className="text-white/70 text-sm">{formatTime(current.created_at)}</span>
      </div>

      {/* Close Button */}
      <button onClick={onClose} className="absolute top-4 right-4 z-10 text-white"><X size={24} /></button>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
        {current.media_type === 'image' && (
          <img src={current.media_url} className="max-w-full max-h-full object-contain" alt="Status" />
        )}
        {current.media_type === 'video' && (
          <video src={current.media_url} className="max-w-full max-h-full object-contain" autoPlay muted loop playsInline />
        )}
        {showText && overlay.text && (
          <div 
            className="absolute text-white p-2 bg-black/50 rounded"
            style={{ left: `${overlay.x}%`, top: `${overlay.y}%`, fontSize: `${overlay.fontSize}px` }}
          >
            {overlay.text}
          </div>
        )}
      </div>

      {/* Navigation Areas */}
      <div className="absolute left-0 top-0 bottom-0 w-1/3" onClick={handlePrev} />
      <div className="absolute right-0 top-0 bottom-0 w-1/3" onClick={handleNext} />

      {/* Reply Input at Bottom */}
      <div className="p-4 bg-black/50">
        <input type="text" placeholder="Reply..." className="w-full p-2 rounded-full bg-white/10 text-white border-none" />
      </div>
    </div>
  );
};

// StatusArchive Component
export const StatusArchive: React.FC = () => {
  const { user } = useAuth();
  const [allStatuses, setAllStatuses] = useState<Status[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const navigate = useNavigate();

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

  const openArchiveViewer = (status: Status) => setSelectedStatus(status);

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
      <h1 className="text-2xl font-bold">Status Archive</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allStatuses.map((status) => (
          <div key={status.id} className="relative group cursor-pointer" onClick={() => openArchiveViewer(status)}>
            {status.media_type === 'image' ? (
              <img src={status.media_url} className="w-full aspect-square object-cover rounded" alt="Archive" />
            ) : (
              <video src={status.media_url} className="w-full aspect-square object-cover rounded" muted />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-end p-2 rounded">
              <span className="text-white text-sm truncate">{new Date(status.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Simple Viewer Modal */}
      {selectedStatus && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4" onClick={() => setSelectedStatus(null)}>
          <div className="relative w-full max-w-md" onClick={e => e.stopPropagation()}>
            {selectedStatus.media_type === 'image' ? (
              <img src={selectedStatus.media_url} className="w-full rounded" alt="Full" />
            ) : (
              <video src={selectedStatus.media_url} className="w-full rounded" controls muted playsInline />
            )}
            <button onClick={() => setSelectedStatus(null)} className="absolute top-2 right-2 text-white"><X size={24} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

// StatusSidebar Component
export const StatusSidebar: React.FC<StatusSidebarProps> = ({ show, onClose, setView, view }) => {
  const menuItems = [
    { icon: <Home size={20} />, label: 'Home', view: 'feed', onClick: () => { setView('feed'); onClose(); } },
    { icon: <Archive size={20} />, label: 'Status Archive', view: 'archive', onClick: () => { setView('archive'); onClose(); } },
  ];

  return (
    <>
      <div className={`fixed left-0 top-0 h-full w-64 bg-[rgb(var(--color-surface))] border-r border-[rgb(var(--color-border))] z-[99] ${show ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 shadow-lg flex-shrink-0`}>
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
      {show && <div className="fixed inset-0 bg-black/50 z-[98]" onClick={onClose} />}
    </>
  );
};

// Global Modals (attach to window for cross-component)
export const Status: React.FC = () => {
  const [showCreator, setShowCreator] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenCreator = () => setShowCreator(true);
    const handleOpenViewer = (e: any) => setViewerUserId(e.detail.userId);

    window.addEventListener('openStatusCreator', handleOpenCreator);
    window.addEventListener('openStatusViewer', handleOpenViewer as EventListener);

    return () => {
      window.removeEventListener('openStatusCreator', handleOpenCreator);
      window.removeEventListener('openStatusViewer', handleOpenViewer as EventListener);
    };
  }, []);

  return (
    <>
      {showCreator && <StatusCreator onClose={() => setShowCreator(false)} />}
      {viewerUserId && <StatusViewer userId={viewerUserId} onClose={() => setViewerUserId(null)} />}
    </>
  );
};
