// src/components/Messages.tsx
import { useEffect, useState, useRef } from 'react';
import { supabase, Message, Profile, uploadMedia } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, BadgeCheck, Search, ArrowLeft, X, Paperclip, FileText, Link } from 'lucide-react';

export const Messages = () => {
  const [conversations, setConversations] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typingChannelRef = useRef<any>(null);
  const outgoingTypingChannelRef = useRef<any>(null);

  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const fetchConversations = async () => {
    if (!user) return;

    // Fetch all unique user IDs involved in messages with the current user
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (messagesError) {
      console.error('Error fetching conversations:', messagesError);
      return;
    }

    // Extract unique partner IDs
    const partnerIds = new Set<string>();
    messagesData.forEach((msg) => {
      if (msg.sender_id !== user.id) {
        partnerIds.add(msg.sender_id);
      }
      if (msg.receiver_id !== user.id) {
        partnerIds.add(msg.receiver_id);
      }
    });

    if (partnerIds.size === 0) {
      setConversations([]);
      return;
    }

    // Convert Set to Array for the `in` query
    const idArray = Array.from(partnerIds);

    // Fetch profile data for all partners
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', idArray);

    if (profilesError) {
      console.error('Error fetching partner profiles:', profilesError);
      return;
    }

    // Sort by last message time (simple, not strictly correct, but better than nothing)
    setConversations(profilesData || []);
  };

  const fetchMessages = async (targetUserId: string) => {
    if (!user) return;

    // Fetch all messages between the current user and the selected user
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
    scrollToBottom();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const textContent = content.trim();
    const mediaUrl = remoteUrl.trim();

    if (!selectedUser || (!textContent && !file && !mediaUrl)) return;

    let finalMediaUrl = mediaUrl;
    let finalFileType = '';

    if (file) {
      setIsUploading(true);
      const { url, type, error } = await uploadMedia(file, user!.id, 'chat', setUploadProgress);
      setIsUploading(false);

      if (error) {
        console.error('File upload failed:', error);
        return;
      }
      finalMediaUrl = url;
      finalFileType = type;
    } else if (mediaUrl) {
      finalFileType = mediaUrl.match(/\.(jpeg|jpg|png|gif)$/i) ? 'image' : mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'link';
    }

    const { error } = await supabase.from('messages').insert({
      sender_id: user!.id,
      receiver_id: selectedUser.id,
      content: textContent,
      media_url: finalMediaUrl,
      file_type: finalFileType,
    });

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setContent('');
      setFile(null);
      setRemoteUrl('');
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Re-fetch or rely on real-time update
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setRemoteUrl(''); // Clear remote URL if a local file is selected
    } else {
      setFile(null);
    }
  };

  const handleSelectUser = (profile: Profile) => {
    setSelectedUser(profile);
    setShowSidebar(false); // Hide sidebar on mobile when a chat is selected
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // --- Real-time and Lifecycle Hooks ---

  useEffect(() => {
    fetchConversations();

    const messagesChannel = supabase
      .channel('messages_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMessage = payload.new as Message;
        if ((newMessage.sender_id === user?.id && newMessage.receiver_id === selectedUser?.id) ||
          (newMessage.sender_id === selectedUser?.id && newMessage.receiver_id === user?.id)) {
          setMessages((prev) => [...prev, newMessage]);
        }
        // Update conversation list if a new chat starts
        if (newMessage.receiver_id === user?.id && !conversations.some(c => c.id === newMessage.sender_id)) {
          fetchConversations();
        }
      })
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
    };
  }, [user, selectedUser, conversations]); // Added conversations to dependencies to ensure new chats update list

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]); // fetchMessages depends on user, but user is stable in auth context

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Typing Indicators Setup
  useEffect(() => {
    if (!selectedUser || !user) {
      if (typingChannelRef.current) {
        typingChannelRef.current.unsubscribe();
        typingChannelRef.current = null;
      }
      if (outgoingTypingChannelRef.current) {
        outgoingTypingChannelRef.current.unsubscribe();
        outgoingTypingChannelRef.current = null;
      }
      return;
    }

    const channelName = [user.id, selectedUser.id].sort().join('-'); // Consistent channel name

    // 1. Channel for receiving typing events (from other user to me)
    typingChannelRef.current = supabase
      .channel(`typing-${channelName}-${selectedUser.id}`) // Listen for events *from* selected user
      .on('broadcast', { event: 'typing' }, () => {
        setIsOtherTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsOtherTyping(false);
        }, 3000);
      })
      .subscribe();

    // 2. Channel for sending typing events (from me to other user)
    outgoingTypingChannelRef.current = supabase
      .channel(`typing-${channelName}-${user.id}`) // My channel
      .subscribe();

    return () => {
      typingChannelRef.current?.unsubscribe();
      outgoingTypingChannelRef.current?.unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);

    // Broadcast typing status
    if (outgoingTypingChannelRef.current && content.length > 0) {
      // Send only if we're not waiting on a cooldown
      outgoingTypingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: user?.id },
      });
    }
  };


  const filteredConversations = conversations.filter(
    (profile) =>
      profile.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-1 h-full overflow-hidden border-t border-[rgb(var(--color-border))]">
      {/* Sidebar: Chat List */}
      <div
        className={`w-full md:w-80 border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] flex-col flex-shrink-0
          ${showSidebar ? 'flex' : 'hidden'} md:flex`}
      >
        <div className="p-4 border-b border-[rgb(var(--color-border))]">
          <h2 className="text-xl font-bold text-[rgb(var(--color-text))] mb-2">Chats</h2>
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))]" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[rgb(var(--color-border))] rounded-full focus:outline-none focus:border-[rgb(var(--color-accent))] bg-[rgb(var(--color-background))] text-[rgb(var(--color-text))]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((profile) => (
              <div
                key={profile.id}
                onClick={() => handleSelectUser(profile)}
                className={`flex items-center p-3 cursor-pointer border-b border-[rgb(var(--color-border))] transition ${selectedUser?.id === profile.id
                    ? 'bg-[rgba(var(--color-accent),0.1)]'
                    : 'hover:bg-[rgb(var(--color-surface-hover))]'
                  }`}
              >
                <img
                  src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                  className="w-12 h-12 rounded-full object-cover mr-3"
                  alt={`${profile.display_name}'s avatar`}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[rgb(var(--color-text))] truncate">
                    {profile.display_name}
                    {profile.is_verified && <BadgeCheck size={16} className="text-[rgb(var(--color-primary))] inline ml-1" />}
                  </div>
                  <div className="text-sm text-[rgb(var(--color-text-secondary))] truncate">
                    @{profile.username}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-[rgb(var(--color-text-secondary))]">
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat View */}
      <div
        className={`flex-1 flex flex-col ${selectedUser ? 'flex' : 'hidden'} md:flex`}
      >
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] flex items-center">
              <button
                onClick={toggleSidebar}
                className="md:hidden p-2 mr-2 rounded-full hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text))]"
              >
                <ArrowLeft size={24} />
              </button>
              <img
                src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.username}`}
                className="w-10 h-10 rounded-full object-cover mr-3"
                alt={`${selectedUser.display_name}'s avatar`}
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[rgb(var(--color-text))] truncate">
                  {selectedUser.display_name}
                  {selectedUser.is_verified && <BadgeCheck size={16} className="text-[rgb(var(--color-primary))] inline ml-1" />}
                </div>
                <div className="text-sm text-[rgb(var(--color-text-secondary))] truncate">
                  @{selectedUser.username}
                </div>
                {isOtherTyping && (
                  <div className="text-sm text-[rgb(var(--color-accent))]">
                    {selectedUser.display_name} is typing...
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            {/* The provided structure was already using overflow-y-auto and flex-1, which is good. */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[rgb(var(--color-background))]">
              {messages.map((message) => {
                const isMe = message.sender_id === user?.id;
                const alignment = isMe ? 'justify-end' : 'justify-start';

                return (
                  <div key={message.id} className={`flex ${alignment}`}>
                    <div
                      className={`max-w-xs sm:max-w-md lg:max-w-lg p-3 rounded-xl shadow-md ${isMe
                          ? 'bg-[rgba(var(--color-primary),1)] text-[rgb(var(--color-text-on-primary))] rounded-br-none'
                          : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))] rounded-tl-none border border-[rgb(var(--color-border))]'
                        }`}
                    >
                      {message.media_url && (
                        <div className="mb-2">
                          {message.file_type === 'image' && (
                            <img
                              src={message.media_url}
                              alt="Media"
                              className="rounded-lg max-h-60 w-full object-contain"
                            />
                          )}
                          {message.file_type === 'video' && (
                            <video controls className="rounded-lg max-h-60 w-full object-contain">
                              <source src={message.media_url} />
                              Your browser does not support the video tag.
                            </video>
                          )}
                          {(message.file_type === 'file' || message.file_type === 'link') && (
                            <a
                              href={message.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center p-2 rounded-lg transition ${isMe ? 'bg-[rgba(var(--color-accent),0.8)] hover:bg-[rgba(var(--color-accent),0.9)]' : 'bg-[rgb(var(--color-background))] hover:bg-[rgb(var(--color-surface-hover))]'}`}
                            >
                              {message.file_type === 'file' ? <FileText size={18} className="mr-2" /> : <Link size={18} className="mr-2" />}
                              {message.file_type === 'file' ? 'File Attachment' : 'External Link'}
                            </a>
                          )}
                        </div>
                      )}

                      {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}

                      <div
                        className={`mt-1 text-xs text-opacity-70 flex flex-col ${isMe ? 'text-[rgb(var(--color-text-on-primary))]' : 'text-[rgb(var(--color-text-secondary))]'}`}
                      >
                        <span className="self-end">{formatMessageTime(message.created_at)}</span>
                        {/* New date display added here */}
                        <span className="self-end text-[10px] opacity-70">{formatMessageDate(message.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[rgb(var(--color-surface))] border-t border-[rgb(var(--color-border))]">
              <input type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <div className="flex items-end gap-2">
                {/* File Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-full text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface-hover))] transition flex-shrink-0"
                  title="Attach file"
                >
                  <Paperclip size={24} />
                </button>

                {/* File/URL Preview and Input */}
                <div className="flex-1 flex items-center gap-1 min-w-0">
                  {file && (
                    <div className="p-2 bg-[rgba(var(--color-accent),0.1)] text-[rgb(var(--color-accent))] rounded-xl text-xs flex items-center flex-shrink-0">
                      <span className="truncate max-w-[80px]">{file.name}</span>
                      <button type="button" onClick={() => setFile(null)} className="ml-2">
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {!file && (
                    <input
                      type="url"
                      placeholder="Paste media URL..."
                      className="flex-1 px-3 py-2 text-sm border border-[rgb(var(--color-border))] rounded-full focus:outline-none focus:border-[rgb(var(--color-accent))] bg-[rgb(var(--color-background))] text-[rgb(var(--color-text))] min-w-0"
                      value={remoteUrl}
                      onChange={(e) => setRemoteUrl(e.target.value)}
                      disabled={isUploading}
                    />
                  )}
                </div>
                
                {/* Main Message Input */}
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 border border-[rgb(var(--color-border))] rounded-full focus:outline-none focus:border-[rgb(var(--color-accent))] text-base bg-[rgb(var(--color-background))] text-[rgb(var(--color-text))] min-w-0"
                  value={content}
                  onChange={handleTyping}
                  disabled={isUploading}
                />
                
                {/* Send Button */}
                <button
                  type="submit"
                  disabled={isUploading || (!content.trim() && !file && !remoteUrl.trim())}
                  className={`p-2 rounded-full transition flex-shrink-0 ${isUploading || (!content.trim() && !file && !remoteUrl.trim()) ? 'bg-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))]' : 'bg-[rgba(var(--color-accent),1)] text-[rgb(var(--color-text-on-primary))] hover:bg-[rgba(var(--color-primary),1)]'}`}
                >
                  <Send size={24} />
                </button>
              </div>
              
              {/* Upload Progress Bar */}
              {isUploading && uploadProgress > 0 && (
                <div className="mt-2 h-1 bg-[rgb(var(--color-border))] rounded-full">
                  <div
                    className="h-full bg-[rgb(var(--color-accent))] rounded-full transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
              {file && !isUploading && (
                <div className="mt-2 text-sm text-[rgb(var(--color-text-secondary))]">
                  Sending file: {file.name}
                </div>
              )}
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[rgb(var(--color-text-secondary))] flex-col">
            <span className="text-xl font-semibold mb-2">Welcome to Messages</span>
            <span className="text-center px-8">
              {showSidebar ? 'Select a chat on the left to start messaging.' : 'Tap the arrow to open the chat list.'}
            </span>
            <button onClick={() => setShowSidebar(true)} className="md:hidden mt-4 bg-[rgba(var(--color-accent),1)] text-[rgb(var(--color-text-on-primary))] px-4 py-2 rounded-full hover:bg-[rgba(var(--color-primary),1)] transition">
              <ArrowLeft className="mr-2 inline" /> Back to Chats
            </button>
          </div>
        )}
      </div>

      {showSidebar && !selectedUser && (
        <div onClick={() => setShowSidebar(false)} className="fixed inset-0 md:hidden bg-black/50 z-40"></div>
      )}
    </div>
  );
};
