import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Edit } from 'lucide-react';
import { supabase, Message } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Helper to format time relative to now
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
};

type Conversation = {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  time: string;
  timestamp: number; // For sorting
  unreadCount: number;
};

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      try {
        // Fetch last 200 messages involving the user to build the inbox list
        // We select the profile data for both sender and recipient
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id (display_name, avatar_url),
            recipient:recipient_id (display_name, avatar_url)
          `)
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) throw error;

        // Process messages to group by conversation partner
        const convMap = new Map<string, Conversation>();

        data?.forEach((msg: any) => {
          const isMeSender = msg.sender_id === user.id;
          const partnerId = isMeSender ? msg.recipient_id : msg.sender_id;
          const partnerProfile = isMeSender ? msg.recipient : msg.sender;
          
          if (!partnerProfile) return; // Skip if user deleted

          const existing = convMap.get(partnerId);
          
          // Calculate unread: If I am recipient and msg is not read
          const isUnread = !isMeSender && !msg.read;

          if (!existing) {
            convMap.set(partnerId, {
              partnerId,
              partnerName: partnerProfile.display_name || 'Unknown',
              partnerAvatar: partnerProfile.avatar_url,
              lastMessage: msg.content || (msg.media_url ? 'Sent a file' : ''),
              time: formatTime(msg.created_at),
              timestamp: new Date(msg.created_at).getTime(),
              unreadCount: isUnread ? 1 : 0
            });
          } else {
            // Since we iterate desc, the first time we see a partner is the latest message.
            // We just need to accumulate unread counts for subsequent messages.
            if (isUnread) {
              existing.unreadCount += 1;
            }
          }
        });

        const sortedConvs = Array.from(convMap.values()).sort((a, b) => b.timestamp - a.timestamp);
        setConversations(sortedConvs);
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    
    // Subscribe to new messages
    const sub = supabase
      .channel('dm-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
         // In a real app, we'd optimistically update the list here or refetch.
         // For simplicity, we re-trigger fetch
         if (payload.new.sender_id === user.id || payload.new.recipient_id === user.id) {
             fetchMessages();
         }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [user]);

  const filteredConversations = conversations.filter(c => 
    c.partnerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <button className="p-2 rounded-full bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))] hover:bg-[rgba(var(--color-primary),0.2)] transition-colors">
            <Edit size={20} />
          </button>
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
        {loading && (
             <div className="flex flex-col gap-2 p-2">
                 {[1,2,3].map(i => <div key={i} className="h-20 bg-[rgb(var(--color-surface))] rounded-2xl animate-pulse" />)}
             </div>
        )}

        {!loading && filteredConversations.length === 0 && (
            <div className="text-center p-8 text-[rgb(var(--color-text-secondary))]">
                No messages found.
            </div>
        )}

        <motion.ul
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
          className="space-y-1"
        >
          {filteredConversations.map((conv) => (
            <motion.li
              key={conv.partnerId}
              variants={{
                hidden: { x: -20, opacity: 0 },
                visible: { x: 0, opacity: 1 }
              }}
              whileHover={{ scale: 1.01, backgroundColor: 'rgba(var(--color-surface-hover), 1)' }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors"
            >
              <div className="relative flex-shrink-0">
                <img 
                    src={conv.partnerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.partnerName}`} 
                    className="w-12 h-12 rounded-full object-cover bg-gray-200" 
                    alt={conv.partnerName} 
                />
                {conv.unreadCount > 0 && (
                   <div className="absolute -top-1 -right-1 w-5 h-5 bg-[rgb(var(--color-primary))] border-2 border-[rgb(var(--color-background))] rounded-full flex items-center justify-center text-[10px] font-bold text-[rgb(var(--color-text-on-primary))]">
                     {conv.unreadCount}
                   </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-[rgb(var(--color-text))]' : 'font-medium text-[rgb(var(--color-text))]'}`}>
                    {conv.partnerName}
                  </h3>
                  <span className={`text-xs ${conv.unreadCount > 0 ? 'text-[rgb(var(--color-primary))] font-bold' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                    {conv.time}
                  </span>
                </div>
                <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-[rgb(var(--color-text))] font-medium' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                  {conv.lastMessage}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </motion.div>
  );
}