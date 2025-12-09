import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit, Send } from 'lucide-react';
import { supabase, Message, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// --- Types for Conversation List ---
type Conversation = {
  otherUser: Profile;
  lastMessage: Message;
  unreadCount: number;
};

// --- Helper Functions ---

// Simple date/time formatter
const formatTimeAgo = (date: string): string => {
  const diff = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return new Date(date).toLocaleDateString();
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'Now';
};

// --- Main Component ---

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ------------------------------------------------------------------
  // 1. DATA FETCHING & REAL-TIME SUBSCRIPTION
  // ------------------------------------------------------------------

  // Fetches all relevant messages and processes them into conversations
  const fetchAndProcessConversations = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch all messages involving the current user, along with profile data
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, username, display_name, avatar_url),
        recipient:recipient_id(id, username, display_name, avatar_url)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
      return;
    }

    if (messages) {
      processMessagesToConversations(messages as (Message & { sender: Profile; recipient: Profile })[]);
    }
    setLoading(false);
  };

  // Groups messages into conversations and updates state
  const processMessagesToConversations = (messages: (Message & { sender: Profile; recipient: Profile })[]) => {
    const conversationMap = new Map<string, { lastMessage: Message; unreadCount: number }>();
    const profileMap = new Map<string, Profile>();
    
    messages.forEach(msg => {
      const isMeSender = msg.sender_id === user!.id;
      const otherUser = isMeSender ? msg.recipient : msg.sender;
      const otherUserId = otherUser.id;

      if (!otherUserId || otherUserId === user!.id) return;

      // Ensure profile data is stored
      profileMap.set(otherUserId, otherUser);

      let convo = conversationMap.get(otherUserId);

      if (!convo) {
        // This is the latest message for this user (due to initial query sort)
        convo = { lastMessage: msg, unreadCount: 0 };
      }
      
      // Count unread messages (only count if I am the recipient and it's not read)
      if (msg.recipient_id === user!.id && !msg.read) {
        convo.unreadCount++;
      }
      
      // Update the map (especially useful for updating unread count for the latest message)
      conversationMap.set(otherUserId, convo);
    });

    const newConversations: Conversation[] = Array.from(conversationMap.entries()).map(([userId, data]) => ({
      otherUser: profileMap.get(userId)!,
      lastMessage: data.lastMessage,
      unreadCount: data.unreadCount,
    }));

    // Final sort by latest message time
    newConversations.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
    
    setConversations(newConversations);
  };

  useEffect(() => {
    fetchAndProcessConversations();

    // Set up real-time listener for new messages
    const channel = supabase
      .channel('messages_channel')
      .on<Message>('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${user?.id}` }, 
        (payload) => handleRealtimeUpdate(payload as RealtimePostgresChangesPayload<Message>)
      )
      .on<Message>('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user?.id}` }, 
        (payload) => handleRealtimeUpdate(payload as RealtimePostgresChangesPayload<Message>)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Handler for real-time updates (new messages)
  const handleRealtimeUpdate = async (payload: RealtimePostgresChangesPayload<Message>) => {
    const newMessage = payload.new;

    // Fetch the profiles for the new message to get display info
    const otherUserId = newMessage.sender_id === user!.id ? newMessage.recipient_id : newMessage.sender_id;
    const { data: otherUser } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
    
    if (!otherUser) return;

    setConversations(prevConversations => {
      const existingConvoIndex = prevConversations.findIndex(c => c.otherUser.id === otherUserId);
      const isMeRecipient = newMessage.recipient_id === user!.id;
      
      const newConvo: Conversation = {
        otherUser: otherUser as Profile,
        lastMessage: newMessage,
        // Increment unread count if I am the recipient and the message is new
        unreadCount: (existingConvoIndex !== -1 && isMeRecipient) 
            ? prevConversations[existingConvoIndex].unreadCount + 1 
            : 1, 
      };

      let newConversations = [...prevConversations];

      if (existingConvoIndex !== -1) {
        // Update existing conversation
        newConversations.splice(existingConvoIndex, 1); // Remove old position
      } else {
        // New conversation, set unread count correctly
        newConvo.unreadCount = isMeRecipient && !newMessage.read ? 1 : 0;
      }
      
      // Add the new conversation to the start and sort (optimistic/quick sort)
      newConversations.unshift(newConvo);
      return newConversations.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
    });
  };

  // ------------------------------------------------------------------
  // 2. UI Rendering and Framer Motion
  // ------------------------------------------------------------------

  const filteredConversations = conversations.filter(convo =>
    convo.otherUser.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    convo.otherUser.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleConversationClick = (convo: Conversation) => {
    // In a full application, this would navigate to a ChatDetail view
    console.log("Opening chat with:", convo.otherUser.display_name);
    // Mark messages as read (optional Supabase call)
    // supabase.from('messages').update({ read: true }).eq('recipient_id', user.id).eq('sender_id', convo.otherUser.id);
  };


  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col"
    >
      <div className="p-4 sticky top-0 bg-[rgb(var(--color-background))] z-10 border-b border-[rgba(var(--color-border),0.5)]">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Messages</h1>
          <motion.button 
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className="p-3 rounded-full bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))] hover:bg-[rgba(var(--color-primary),0.2)] transition-colors"
          >
            <Edit size={20} />
          </motion.button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))]" size={18} />
          <input 
            type="text" 
            placeholder="Search DMs" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[rgb(var(--color-surface))] border border-[rgba(var(--color-border),0.5)] focus:outline-none focus:border-[rgb(var(--color-primary))] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 pb-24">
        {loading ? (
           <div className="flex justify-center p-4">
             <div className="animate-spin h-6 w-6 border-2 border-[rgb(var(--color-primary))] rounded-full border-t-transparent"/>
           </div>
        ) : (
          <motion.ul
            layout
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
            className="space-y-1"
          >
            <AnimatePresence>
            {filteredConversations.length === 0 && (
               <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-[rgb(var(--color-text-secondary))] py-10">
                 No conversations found.
               </motion.li>
            )}

            {filteredConversations.map((convo) => {
                const isUnread = convo.unreadCount > 0;

                return (
                <motion.li
                  key={convo.otherUser.id}
                  layout
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  whileHover={{ scale: 1.01, backgroundColor: 'rgba(var(--color-surface-hover), 1)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleConversationClick(convo)}
                  className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors ${isUnread ? 'bg-[rgba(var(--color-primary),0.05)]' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <img 
                      src={convo.otherUser.avatar_url || `https://i.pravatar.cc/150?u=${convo.otherUser.username}`} 
                      className="w-12 h-12 rounded-full object-cover bg-gray-700" 
                      alt={convo.otherUser.display_name} 
                    />
                    {isUnread && (
                       <motion.div 
                         initial={{ scale: 0 }}
                         animate={{ scale: 1 }}
                         className="absolute -top-1 -right-1 w-5 h-5 bg-[rgb(var(--color-primary))] border-2 border-[rgb(var(--color-background))] rounded-full flex items-center justify-center text-[10px] font-bold text-[rgb(var(--color-text-on-primary))]"
                       >
                         {convo.unreadCount}
                       </motion.div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className={`text-sm truncate ${isUnread ? 'font-bold' : 'font-medium'} text-[rgb(var(--color-text))]`}>
                        {convo.otherUser.display_name}
                      </h3>
                      <span className={`text-xs ${isUnread ? 'text-[rgb(var(--color-primary))] font-bold' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                        {formatTimeAgo(convo.lastMessage.created_at)}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${isUnread ? 'text-[rgb(var(--color-text))] font-bold' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                      {convo.lastMessage.sender_id === user?.id ? <span className="text-[rgb(var(--color-text-secondary))] font-normal">You: </span> : ''}
                      {convo.lastMessage.content}
                    </p>
                  </div>
                </motion.li>
              );
            })}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </motion.div>
  );
}