// src/components/Gazebos.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase, Profile, Gazebo, GazeboChannel, GazeboMessage, uploadMedia } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Hash, Volume2, Plus, Settings, Users, X, Send, Paperclip, Mic, Link as LinkIcon,
  MoreVertical, Trash2, Edit3, Check, XCircle, Copy, UserPlus, Crown, Shield,
  ChevronDown, ChevronRight, Menu, Search, FileText
} from 'lucide-react';

// Props for Gazebos component
type GazebosProps = {
  // Used by App.tsx to handle a pending invite from a URL
  initialInviteCode?: string | null;
  onInviteHandled?: () => void;
};

type MemberWithProfile = {
  user_id: string;
  role: 'owner' | 'admin' | 'member'; // Standardized roles based on the database column addition
  role_name: string;
  role_color: string;
  profiles: Profile;
};

type InviteLink = {
  id: string;
  invite_code: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
};

// ===============================================
// HELPER COMPONENT (Based on Messages.tsx usage)
// ===============================================

// Basic AudioPlayer component from Messages.tsx structure
const AudioPlayer = ({ src, isOutgoing }: { src: string, isOutgoing: boolean }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const primaryColor = isOutgoing ? 'rgb(var(--color-primary))' : 'rgb(var(--color-accent))';

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, []);

  return (
    <div className="flex items-center space-x-2 w-full max-w-full">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button onClick={handlePlayPause} className={`flex-shrink-0 p-2 rounded-full transition-colors`} style={{ backgroundColor: isOutgoing ? 'rgba(var(--color-text-on-primary), 0.15)' : 'rgb(var(--color-surface-hover))', color: primaryColor, }} >
        {isPlaying ? <Pause size={16} fill={primaryColor} /> : <Play size={16} fill={primaryColor} />}
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-2 text-sm text-[rgb(var(--color-text-secondary))]">
          {/* Progress bar and time display would go here (similar to Messages.tsx) */}
          Voice Message
      </div>
    </div>
  );
};


// ===============================================
// MAIN GAZEOBOS COMPONENT
// ===============================================

export const Gazebos = ({ initialInviteCode, onInviteHandled }: GazebosProps) => {
  const { user } = useAuth();
  const [gazebos, setGazebos] = useState<Gazebo[]>([]);
  const [activeGazebo, setActiveGazebo] = useState<Gazebo | null>(null);
  const [channels, setChannels] = useState<GazeboChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<GazeboChannel | null>(null);
  const [messages, setMessages] = useState<GazeboMessage[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);

  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [membersPanelOpen, setMembersPanelOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);

  // Message input (exact same as Messages.tsx)
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [mediaInputMode, setMediaInputMode] = useState<'file' | 'url' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Edit states
  const [editingGazeboName, setEditingGazeboName] = useState(false);
  const [newGazeboName, setNewGazeboName] = useState('');
  const [editingChannelName, setEditingChannelName] = useState<string | null>(null);
  const [newChannelName, setNewChannelName] = useState('');

  // Permissions check helper
  const isOwner = activeGazebo?.owner_id === user?.id;
  const canManageGazebo = isOwner; // Simple check for now.

  // Helper to determine member's role display
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'owner': return { name: 'Owner', color: '#fdd835' };
      case 'admin': return { name: 'Admin', color: '#54b4d6' };
      default: return { name: 'Member', color: '#99aab5' };
    }
  }

  // === DATA LOADING & INVITE HANDLING ===

  // 1. Load gazebos + handle initial invite
  useEffect(() => {
    if (!user) return;
    const fetchGazebos = async () => {
      const { data } = await supabase
        .from('gazebo_members')
        .select('gazebo_id, gazebos(*)')
        .eq('user_id', user.id);

      if (data) {
        const gazebosList = data.map(d => d.gazebos).filter(Boolean) as Gazebo[];
        setGazebos(gazebosList);

        // Handle invite code if present
        if (initialInviteCode) {
            const joinedGazebo = await handleInviteJoin(initialInviteCode);
            if (joinedGazebo) {
                setActiveGazebo(joinedGazebo);
            }
            // Signal App.tsx that the invite has been processed
            if (onInviteHandled) onInviteHandled();
        } else if (gazebosList.length > 0 && !activeGazebo) {
            // Default to the first gazebo if no invite is pending
            setActiveGazebo(gazebosList[0]);
        }
      }
    };
    fetchGazebos();
  }, [user, initialInviteCode]);

  // 2. Handle a user joining via an invite link
  const handleInviteJoin = async (code: string): Promise<Gazebo | null> => {
    if (!user) return null;

    // 1. Validate invite code
    const { data: invite, error: inviteError } = await supabase
        .from('gazebo_invites')
        .select('*, gazebos(*)')
        .eq('invite_code', code)
        .single();

    if (inviteError || !invite?.gazebos) {
        alert('Invalid or expired invite code.');
        return null;
    }

    const gazeboToJoin = invite.gazebos as Gazebo;

    // Check if already a member
    const { count: memberCount } = await supabase
        .from('gazebo_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('gazebo_id', gazeboToJoin.id)
        .eq('user_id', user.id);

    if (memberCount === 0) {
        // 2. Add member to gazebo_members
        const { error: memberError } = await supabase
            .from('gazebo_members')
            .insert({
                gazebo_id: gazeboToJoin.id,
                user_id: user.id,
                role: 'member',
            });

        if (memberError) {
            console.error('Error joining gazebo:', memberError);
            alert('Failed to join the gazebo.');
            return null;
        }

        // 3. Update invite use count
        await supabase
            .from('gazebo_invites')
            .update({ uses_count: invite.uses_count + 1 })
            .eq('id', invite.id);

        // 4. Update local gazebos list
        setGazebos(prev => [...prev, gazeboToJoin]);
    }

    return gazeboToJoin;
  };


  // 3. Select gazebo → load channels + members + invites
  useEffect(() => {
    if (!activeGazebo) {
      setChannels([]);
      setMembers([]);
      setActiveChannel(null);
      setInviteLinks([]);
      return;
    }

    const load = async () => {
      // Load Channels
      const { data: channelsData } = await supabase
        .from('gazebo_channels')
        .select('*')
        .eq('gazebo_id', activeGazebo.id)
        .order('created_at', { ascending: true });
      
      setChannels(channelsData || []);
      setActiveChannel(channelsData ? channelsData.find(c => c.type === 'text') || channelsData[0] : null);

      // Load Members
      const { data: membersData } = await supabase
        .from('gazebo_members')
        .select('user_id, role, profiles(*)')
        .eq('gazebo_id', activeGazebo.id);
      
      const membersList: MemberWithProfile[] = (membersData || []).map(m => {
          const roleDisplay = getRoleDisplay(m.role as string);
          return {
              user_id: m.user_id,
              role: m.role as 'owner' | 'admin' | 'member',
              role_name: roleDisplay.name,
              role_color: roleDisplay.color,
              profiles: m.profiles as Profile,
          }
      });
      setMembers(membersList);

      // Load Invites (Owner/Admin only)
      if (canManageGazebo) {
        const { data: inviteData } = await supabase
            .from('gazebo_invites')
            .select('*')
            .eq('gazebo_id', activeGazebo.id)
            .order('created_at', { ascending: false });
        setInviteLinks(inviteData || []);
      }
    };
    load();
  }, [activeGazebo, user, canManageGazebo]);

  // 4. Load messages + realtime
  useEffect(() => {
    if (!activeChannel || activeChannel.type !== 'text') {
        setMessages([]);
        return;
    }

    const loadMessages = async () => {
      const { data } = await supabase
        .from('gazebo_messages')
        .select('*, sender:profiles(*)')
        .eq('channel_id', activeChannel.id)
        .order('created_at', { ascending: true });
      setMessages((data || []) as GazeboMessage[]);
      scrollToBottom();
    };

    loadMessages();

    const channel = supabase.channel(`gazebo:${activeChannel.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gazebo_messages', filter: `channel_id=eq.${activeChannel.id}` }, payload => {
        const msg = payload.new as GazeboMessage;
        supabase.from('profiles').select('*').eq('id', msg.user_id).single()
          .then(({ data }) => {
            setMessages(prev => [...prev, { ...msg, sender: data as Profile }]);
            scrollToBottom();
          });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannel]);


  // === UTILITY FUNCTIONS ===

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Resets all message input states
  const resetMessageInput = () => {
    setContent('');
    setFile(null);
    setRemoteUrl('');
    setIsUploading(false);
    setUploadProgress(0);
    setShowMediaMenu(false);
    setMediaInputMode(null);
  };

  // Logic to show a preview of attached media (from Messages.tsx)
  const getPreview = useCallback(() => {
    if (file) {
      if (file.type.startsWith('image/')) return <img src={URL.createObjectURL(file)} className="max-h-20 max-w-full rounded-md object-contain" alt="Image preview" />;
      if (file.type.startsWith('video/')) return <video src={URL.createObjectURL(file)} className="max-h-20 max-w-full rounded-md object-contain" controls />;
      if (file.type.startsWith('audio/')) return <span className="text-sm font-semibold">Audio file: {file.name}</span>;
      return <span className="text-sm font-semibold">File: {file.name}</span>;
    }
    if (remoteUrl) return <span className="text-sm text-gray-400 truncate">URL: {remoteUrl}</span>;
    return null;
  }, [file, remoteUrl]);

  // Audio Recording Handlers (from Messages.tsx)
  const handleStartRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Check for supported recorder
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = event => {
          audioChunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
          const mimeType = recorder.mimeType || 'audio/webm';
          const cleanExt = mimeType.split('/')[1]?.split(';')[0] || 'weba';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const audioFile = new File([audioBlob], `voice-message.${cleanExt}`, { type: mimeType });
          setFile(audioFile);
          setIsRecording(false);
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setIsRecording(true);
        setFile(null);
        setRemoteUrl('');
        setMediaInputMode(null);
      })
      .catch(err => {
        console.error("Mic error:", err);
        alert("Mic not found or permission was denied.");
      });
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };


  // === MESSAGE SENDING ===

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannel || !user || isUploading || (!content.trim() && !file && !remoteUrl.trim())) return;

    let media_url = null;
    let media_type = null;

    if (file) {
      setIsUploading(true);
      if (file.type.startsWith('audio/')) media_type = 'audio';

      const result = await uploadMedia(file, 'gazebo-messages', (percent) => {
        setUploadProgress(percent);
      });

      if (!result) {
        setIsUploading(false);
        return;
      }
      media_url = result.url;
      media_type = media_type || result.type;
    } else if (remoteUrl.trim()) {
      media_url = remoteUrl.trim();
      // Basic type inference for remote URL (from Messages.tsx logic)
      if (remoteUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) media_type = 'image';
      else if (remoteUrl.match(/\.(mp4|webm|mov|avi)$/i)) media_type = 'video';
      else if (remoteUrl.match(/\.(mp3|weba|ogg|wav|m4a)$/i)) media_type = 'audio';
      else media_type = 'document';
    }

    const { error } = await supabase
      .from('gazebo_messages')
      .insert({
        channel_id: activeChannel.id,
        user_id: user.id,
        content: content.trim(),
        media_url: media_url || '',
        media_type: media_type,
      });

    setIsUploading(false);
    if (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message.');
    } else {
      resetMessageInput();
    }
  };

  // === GAZEOB/CHANNEL MANAGEMENT ===

  const renameGazebo = async () => {
    if (!activeGazebo || !newGazeboName.trim() || !isOwner) return;
    await supabase.from('gazebos').update({ name: newGazeboName.trim() }).eq('id', activeGazebo.id);
    setActiveGazebo(prev => (prev ? { ...prev, name: newGazeboName.trim() } : null));
    setGazebos(gazebos.map(g => g.id === activeGazebo.id ? { ...g, name: newGazeboName.trim() } : g));
    setEditingGazeboName(false);
  };

  const renameChannel = async (channelId: string) => {
    if (!activeGazebo || !newChannelName.trim() || !isOwner) return;
    await supabase.from('gazebo_channels').update({ name: newChannelName.trim() }).eq('id', channelId);
    setChannels(channels.map(c => c.id === channelId ? { ...c, name: newChannelName.trim() } : c));
    setActiveChannel(prev => (prev && prev.id === channelId ? { ...prev, name: newChannelName.trim() } : prev));
    setEditingChannelName(null);
  };

  const createChannel = async () => {
    if (!activeGazebo || !newChannelName.trim() || !isOwner) return;
    const { data, error } = await supabase.from('gazebo_channels').insert({
        gazebo_id: activeGazebo.id,
        name: newChannelName.trim(),
        type: 'text',
    }).select().single();

    if (error) return console.error(error);
    setChannels(prev => [...prev, data as GazeboChannel]);
    setNewChannelName('');
  };

  const deleteChannel = async (channelId: string) => {
      if (!confirm('Are you sure you want to delete this channel?')) return;
      await supabase.from('gazebo_channels').delete().eq('id', channelId);
      setChannels(prev => prev.filter(c => c.id !== channelId));
      if (activeChannel?.id === channelId) setActiveChannel(channels.find(c => c.type === 'text' && c.id !== channelId) || null);
  };

  // === INVITE LINK MANAGEMENT ===

  const createInvite = async (customCode: string) => {
    if (!activeGazebo || !isOwner) return;
    const code = customCode.trim() || Math.random().toString(36).substring(2, 8); // Generate random if no custom code
    
    const { data, error } = await supabase.from('gazebo_invites').insert({
        gazebo_id: activeGazebo.id,
        invite_code: code,
        created_by_user_id: user!.id,
    }).select().single();

    if (error) {
        alert('Failed to create invite. Code might already be in use.');
        return;
    }
    setInviteLinks(prev => [data as InviteLink, ...prev]);
  };

  const deleteInvite = async (id: string) => {
    if (!isOwner) return;
    await supabase.from('gazebo_invites').delete().eq('id', id);
    setInviteLinks(prev => prev.filter(i => i.id !== id));
  };

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
    alert('Invite link copied to clipboard!');
  };


  // === RENDER LOGIC ===

  const renderMessageContent = (msg: GazeboMessage) => {
    // Replicate Messages.tsx media/content rendering
    const isOutgoing = msg.user_id === user?.id;

    return (
        <div className="flex flex-col">
            <p className="whitespace-pre-wrap text-[rgb(var(--color-text))]">{msg.content}</p>
            {msg.media_url && (
                <div className={msg.content.trim() ? "mt-2" : ""}>
                    {msg.media_type === 'image' && (
                        <img src={msg.media_url} className={`rounded-lg max-w-full h-auto max-h-80 object-contain`} alt="Message" />
                    )}
                    {msg.media_type === 'video' && (
                        <video controls className={`rounded-lg max-w-full max-h-80`}>
                            <source src={msg.media_url} />
                        </video>
                    )}
                    {msg.media_type === 'audio' && (
                        <div>
                            <AudioPlayer src={msg.media_url} isOutgoing={isOutgoing} />
                        </div>
                    )}
                    {msg.media_type === 'document' && (
                        <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-[rgb(var(--color-primary))] underline" >
                            <FileText size={14} /> Open File
                        </a>
                    )}
                </div>
            )}
        </div>
    );
  };

  const MessageComposer = () => (
    <div className="p-4 bg-[rgb(var(--color-surface))]">
      {/* Media Preview (from Messages.tsx) */}
      {(file || remoteUrl) && (
          <div className="p-3 bg-[rgb(var(--color-surface-hover))] rounded-lg flex items-center justify-between mb-3">
              <div className="flex-1 pr-2 min-w-0">
                  {getPreview()}
              </div>
              <button type="button" onClick={resetMessageInput} className="p-1 hover:bg-[rgb(var(--color-border))] rounded-full transition text-[rgb(var(--color-text))]" >
                  <X size={18} />
              </button>
          </div>
      )}

      {/* URL Input (if mode is active) */}
      {mediaInputMode === 'url' && !file && !remoteUrl && (
          <div className="p-3 mb-3 bg-[rgb(var(--color-surface-hover))] rounded-lg">
              <div className="flex items-center gap-2">
                  <LinkIcon size={20} className="text-[rgb(var(--color-text-secondary))]" />
                  <input
                      type="url"
                      value={remoteUrl}
                      onChange={(e) => setRemoteUrl(e.target.value)}
                      placeholder="Paste media link here (image, video, or audio)"
                      className="flex-1 bg-transparent text-[rgb(var(--color-text))] outline-none"
                  />
                  <button type="button" onClick={() => setMediaInputMode(null)} className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]">
                      <X size={18} />
                  </button>
              </div>
          </div>
      )}

      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-[rgb(var(--color-surface-hover))] rounded-xl p-2 shadow-inner">
        
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => {
            setShowMediaMenu(prev => !prev);
            setMediaInputMode(null); // Close URL/file mode when opening menu
            setFile(null); // Clear previous attachment
            setRemoteUrl('');
          }}
          className={`p-2 rounded-full transition text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] relative`}
          title="Attach Media"
          disabled={isRecording}
        >
          <Paperclip size={20} />
          {showMediaMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-48 bg-[rgb(var(--color-surface))] rounded-lg shadow-xl z-10 border border-[rgb(var(--color-border))]">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text))]"
                >
                    <Paperclip size={18} /> Upload File
                </button>
                <button
                    type="button"
                    onClick={() => { setMediaInputMode('url'); setShowMediaMenu(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text))]"
                >
                    <LinkIcon size={18} /> Paste URL
                </button>
            </div>
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              setFile(e.target.files[0]);
              setRemoteUrl('');
              setMediaInputMode('file');
              setShowMediaMenu(false);
            }
          }}
          accept="image/*,video/*,audio/*,application/pdf"
        />

        {/* Text Input */}
        <input
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={`Message #${activeChannel?.name || 'general'}`}
          className="flex-1 bg-transparent text-[rgb(var(--color-text))] outline-none min-w-0"
          disabled={isRecording || isUploading}
        />

        {/* Voice Recording Button */}
        <button
            type="button"
            onClick={toggleRecording}
            className={`p-2 rounded-full transition ${isRecording ? 'bg-red-500 text-white' : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))]'}`}
            title={isRecording ? 'Stop Recording' : 'Start Voice Message'}
            disabled={isUploading || (!!file || !!remoteUrl)}
        >
            <Mic size={20} />
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={isUploading || isRecording || (!content.trim() && !file && !remoteUrl.trim())}
          className={`p-2 rounded-full transition ${isUploading || isRecording || (!content.trim() && !file && !remoteUrl.trim()) ? 'bg-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))]' : 'bg-[rgba(var(--color-accent),1)] text-[rgb(var(--color-text-on-primary))] hover:bg-[rgba(var(--color-primary),1)]'}`}
          title="Send Message"
        >
          <Send size={20} />
        </button>
      </form>
      {/* Upload Progress Bar */}
      {isUploading && uploadProgress > 0 && (
          <div className="mt-2 h-1 bg-[rgb(var(--color-border))] rounded-full">
              <div className="h-1 bg-[rgb(var(--color-primary))] rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
          </div>
      )}
    </div>
  );

  const InviteModal = () => {
    const [customCode, setCustomCode] = useState('');
    if (!isInviteModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
            <div className="bg-[rgb(var(--color-surface))] p-6 rounded-lg shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Invite to {activeGazebo?.name}</h3>
                    <button onClick={() => setIsInviteModalOpen(false)} className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]"><X /></button>
                </div>

                <div className="space-y-4 mb-6">
                    <h4 className="font-semibold text-lg border-b border-[rgb(var(--color-border))] pb-1">Create New Link</h4>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={customCode}
                            onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                            placeholder="Custom Code (optional)"
                            className="flex-1 p-2 border border-[rgb(var(--color-border))] rounded bg-transparent"
                        />
                        <button
                            onClick={() => createInvite(customCode)}
                            className="bg-[rgb(var(--color-primary))] text-white px-4 py-2 rounded hover:bg-[rgb(var(--color-primary-dark))]"
                        >
                            Create
                        </button>
                    </div>

                    <h4 className="font-semibold text-lg border-b border-[rgb(var(--color-border))] pb-1 mt-6">Active Links</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                        {inviteLinks.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between p-2 bg-[rgb(var(--color-surface-hover))] rounded text-sm">
                                <span className="font-mono text-[rgb(var(--color-text-secondary))]">/invite/{invite.invite_code}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-[rgb(var(--color-text-secondary))]">{invite.uses_count} uses</span>
                                    <button onClick={() => copyInviteLink(invite.invite_code)} className="text-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary-dark))]"><Copy size={16} /></button>
                                    <button onClick={() => deleteInvite(invite.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                        {inviteLinks.length === 0 && <p className="text-sm text-center text-[rgb(var(--color-text-secondary))]">No active invite links.</p>}
                    </div>
                </div>

            </div>
        </div>
    );
  };

  // Main Render
  if (!user) return <div className="p-4 text-center">Please log in to use Gazebos.</div>;
  if (gazebos.length === 0) return <div className="p-4 text-center">You are not a member of any Gazebos yet.</div>;
  if (!activeGazebo) return <div className="p-4 text-center">Loading Gazebo...</div>;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 1. DISCORD-STYLE GAZEOBO LIST (Far Left) */}
      <div className="w-20 bg-[rgb(var(--color-background))] flex flex-col items-center py-4 space-y-3 shadow-xl">
        {gazebos.map(g => (
          <button
            key={g.id}
            onClick={() => setActiveGazebo(g)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold transition-all duration-200 ${activeGazebo?.id === g.id ? 'rounded-xl bg-[rgb(var(--color-primary))] ring-2 ring-[rgb(var(--color-primary))]' : 'bg-[rgb(var(--color-surface))] hover:rounded-xl hover:bg-[rgb(var(--color-primary))]'}`}
            title={g.name}
          >
            {g.name[0]?.toUpperCase() || 'G'}
          </button>
        ))}
        {/* Add Gazebo Button */}
        <button
          onClick={() => { /* Open 'Create New Gazebo' Modal */ }}
          className="w-12 h-12 rounded-full bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary))] hover:text-white flex items-center justify-center transition-all"
          title="Create/Join Gazebo"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* 2. CHANNELS/CHAT LIST (Left Sidebar) */}
      <div className={`flex-shrink-0 w-60 bg-[rgb(var(--color-surface))] border-r border-[rgb(var(--color-border))] flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed inset-y-0 left-20 z-40 md:relative md:left-0`}>
        {/* Gazebo Header */}
        <div className="p-4 border-b border-[rgb(var(--color-border))] flex justify-between items-center relative">
          {editingGazeboName ? (
            <div className="flex items-center w-full">
              <input
                type="text"
                value={newGazeboName}
                onChange={e => setNewGazeboName(e.target.value)}
                className="flex-1 bg-transparent font-bold text-lg outline-none border-b border-[rgb(var(--color-primary))]"
                onKeyDown={(e) => e.key === 'Enter' && renameGazebo()}
              />
              <button onClick={renameGazebo}><Check size={18} className="text-green-500 ml-2" /></button>
              <button onClick={() => setEditingGazeboName(false)}><X size={18} className="text-red-500 ml-1" /></button>
            </div>
          ) : (
            <>
              <span className="font-bold text-lg truncate">{activeGazebo.name}</span>
              {canManageGazebo && (
                <button onClick={() => { setIsSettingsOpen(prev => !prev); setIsInviteModalOpen(false); }} className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]">
                  <ChevronDown size={20} />
                </button>
              )}
              {isSettingsOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-[rgb(var(--color-surface))] rounded-md shadow-xl z-50 border border-[rgb(var(--color-border))]">
                  <button onClick={() => { setNewGazeboName(activeGazebo.name); setEditingGazeboName(true); setIsSettingsOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))]"><Edit3 size={18} /> Rename</button>
                  <button onClick={() => { setIsInviteModalOpen(true); setIsSettingsOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))] text-green-500"><UserPlus size={18} /> Invite People</button>
                  <button onClick={() => { /* Delete Gazebo logic */ }} className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))] text-red-500"><Trash2 size={18} /> Delete Gazebo</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-2">
          <h3 className="text-xs font-bold uppercase text-[rgb(var(--color-text-secondary))] mt-3 mb-1 px-2 flex justify-between items-center">
            TEXT CHANNELS
            {isOwner && (
                <button onClick={() => { setNewChannelName(''); setEditingChannelName('new'); }} title="Create Channel" className="hover:text-[rgb(var(--color-text))]"><Plus size={16} /></button>
            )}
          </h3>

          {/* New Channel Input */}
          {editingChannelName === 'new' && (
             <div className="flex items-center gap-1 p-1">
                <Hash size={18} className="text-[rgb(var(--color-text-secondary))]" />
                <input
                    type="text"
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    placeholder="new-channel-name"
                    className="flex-1 bg-transparent outline-none border-b border-[rgb(var(--color-primary))] text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && createChannel()}
                />
                <button onClick={createChannel}><Check size={16} className="text-green-500" /></button>
                <button onClick={() => setEditingChannelName(null)}><X size={16} className="text-red-500" /></button>
            </div>
          )}
          
          {channels.filter(c => c.type === 'text').map(c => (
            <div key={c.id} className="relative group">
                {editingChannelName === c.id ? (
                    <div className="flex items-center gap-1 p-1">
                        <Hash size={18} className="text-[rgb(var(--color-text-secondary))]" />
                        <input
                            type="text"
                            value={newChannelName}
                            onChange={e => setNewChannelName(e.target.value)}
                            className="flex-1 bg-transparent outline-none border-b border-[rgb(var(--color-primary))] text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && renameChannel(c.id)}
                        />
                        <button onClick={() => renameChannel(c.id)}><Check size={16} className="text-green-500" /></button>
                        <button onClick={() => setEditingChannelName(null)}><X size={16} className="text-red-500" /></button>
                    </div>
                ) : (
                    <button
                        onClick={() => setActiveChannel(c)}
                        className={`w-full text-left flex items-center justify-between px-2 py-1.5 rounded-md transition ${activeChannel?.id === c.id ? 'bg-[rgb(var(--color-primary))] text-white' : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface-hover))]'}`}
                    >
                        <span className="flex items-center gap-2 truncate">
                            <Hash size={18} />
                            {c.name}
                        </span>
                        {isOwner && (
                            <div className={`opacity-0 group-hover:opacity-100 flex gap-1 ${activeChannel?.id === c.id ? 'opacity-100' : ''}`}>
                                <button onClick={(e) => { e.stopPropagation(); setNewChannelName(c.name); setEditingChannelName(c.id); }} title="Rename Channel" className="p-0.5 hover:text-[rgb(var(--color-text))]"><Edit3 size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteChannel(c.id); }} title="Delete Channel" className="p-0.5 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                        )}
                    </button>
                )}
            </div>
          ))}

          <h3 className="text-xs font-bold uppercase text-[rgb(var(--color-text-secondary))] mt-4 mb-1 px-2">VOICE CHANNELS</h3>
          {channels.filter(c => c.type === 'voice').map(c => (
            <button
              key={c.id}
              className={`w-full text-left flex items-center px-2 py-1.5 rounded-md transition text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface-hover))]`}
            >
              <Volume2 size={18} className="mr-2" />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CHAT CONTENT (Main Panel) */}
      <div className="flex-1 min-w-0 h-full flex flex-col bg-[rgb(var(--color-background))]">
        {/* Chat Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] shadow-sm">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden"><Menu size={24} /></button>
            <Hash size={24} className="text-[rgb(var(--color-text-secondary))]" />
            <span className="font-semibold text-lg">{activeChannel?.name || 'general'}</span>
          </div>
          <div className="flex items-center gap-4">
            <button title="Search" className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]"><Search size={20} /></button>
            <button onClick={() => setMembersPanelOpen(!membersPanelOpen)} title="Toggle Member List" className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]"><Users size={20} /></button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map(msg => (
            <div key={msg.id} className="flex gap-3 hover:bg-[rgba(var(--color-surface-hover), 0.5)] p-2 -mx-2 rounded-lg">
              <img
                src={msg.sender?.avatar_url || `https://ui-avatars.com/api/?name=${msg.sender?.username}`}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                alt={msg.sender?.username}
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[rgb(var(--color-text))]">{msg.sender?.display_name || msg.sender?.username}</span>
                  <span className="text-xs text-[rgb(var(--color-text-secondary))]">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {renderMessageContent(msg)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer (Integrated Messages.tsx Panel) */}
        {activeChannel && activeChannel.type === 'text' && <MessageComposer />}
      </div>

      {/* 4. MEMBER LIST (Right Sidebar) */}
      <div className={`flex-shrink-0 w-60 bg-[rgb(var(--color-surface))] p-4 border-l border-[rgb(var(--color-border))] flex flex-col transition-transform duration-300 ease-in-out ${membersPanelOpen ? 'translate-x-0' : 'translate-x-full'} fixed inset-y-0 right-0 z-40 md:relative md:right-0 md:translate-x-0`}>
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase text-[rgb(var(--color-text-secondary))]">Members — {members.length}</h3>
              <button onClick={() => setMembersPanelOpen(false)} className="md:hidden text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]"><X size={20} /></button>
          </div>

          <div className="flex flex-col space-y-1 overflow-y-auto flex-1">
              {members
              // Sort: Owner first, then Admin, then Member
              .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 
                              a.role === 'admin' ? -1 : b.role === 'admin' ? 1 : 0))
              .map(m => (
                  <div key={m.user_id} className="flex items-center gap-2 p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] cursor-pointer">
                      <div className="relative">
                          <img src={m.profiles.avatar_url || `https://ui-avatars.com/api/?name=${m.profiles.username}`} className="w-8 h-8 rounded-full object-cover" alt="" />
                          {/* Online status indicator would go here */}
                      </div>
                      <span className="font-semibold text-sm truncate" style={{ color: m.role_color }}>
                          {m.profiles.display_name || m.profiles.username}
                      </span>
                      {m.role === 'owner' && <Crown size={14} className="text-yellow-500 flex-shrink-0 ml-auto" title="Gazebo Owner" />}
                      {m.role === 'admin' && <Shield size={14} className="text-blue-500 flex-shrink-0 ml-auto" title="Gazebo Admin" />}
                  </div>
              ))}
          </div>
      </div>

      <InviteModal />
    </div>
  );
};
