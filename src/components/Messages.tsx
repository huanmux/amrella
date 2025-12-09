import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Edit } from 'lucide-react';
import { supabase, Message, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Conversation = {
  user: Profile;
  lastMessage: Message;
};

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch conversations (simplified for this structure)
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      setLoading(true);

      // 1. Get all messages sent or received by user
      const { data: messages } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(username, display_name, avatar_url),
          recipient:recipient_id(username, display_name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messages) {
        // 2. Group by "other user" to find unique conversations
        const uniqueConversations = new Map<string, Conversation>();

        messages.forEach((msg: any) => {
          const isMeSender = msg.sender_id === user.id;
          const otherUser = isMeSender ? msg.recipient : msg.sender;
          const otherUserId = isMeSender ? msg.recipient_id : msg.sender_id;

          if (!otherUser || !otherUserId) return;

          // Only keep the first (latest) message encountered for each user
          if (!uniqueConversations.has(otherUserId)) {
            uniqueConversations.set(otherUserId, {
              user: otherUser,
              lastMessage: msg
            });
          }
        });

        setConversations(Array.from(uniqueConversations.values()));
      }
      setLoading(false);
    };

    fetchConversations();
  }, [user]);

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
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[rgb(var(--color-surface))] border border-[rgba(var(--color-border),0.5)] focus:outline-none focus:border-[rgb(var(--color-primary))] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 pb-24">
        {loading ? (
           <div className="flex justify-center p-4"><div className="animate-spin h-6 w-6 border-2 border-[rgb(var(--color-primary))] rounded-full border-t-transparent"/></div>
        ) : (
          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
            className="space-y-1"
          >
            {conversations.length === 0 && (
               <div className="text-center text-[rgb(var(--color-text-secondary))] py-10">
                 No conversations yet. Start a chat!
               </div>
            )}
            
            {conversations.map((convo) => (
              <motion.li
                key={convo.user.username} // using username as unique key fallback
                variants={{
                  hidden: { x: -20, opacity: 0 },
                  visible: { x: 0, opacity: 1 }
                }}
                whileHover={{ scale: 1.01, backgroundColor: 'rgba(var(--color-surface-hover), 1)' }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors"
              >
                <div className="relative">
                  <img 
                    src={convo.user.avatar_url || `https://i.pravatar.cc/150?u=${convo.user.username}`} 
                    className="w-12 h-12 rounded-full object-cover bg-gray-200" 
                    alt={convo.user.display_name} 
                  />
                  {!convo.lastMessage.read && convo.lastMessage.recipient_id === user?.id && (
                     <div className="absolute -top-1 -right-1 w-4 h-4 bg-[rgb(var(--color-primary))] border-2 border-[rgb(var(--color-background))] rounded-full" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-sm truncate ${!convo.lastMessage.read && convo.lastMessage.recipient_id === user?.id ? 'font-bold' : 'font-medium'} text-[rgb(var(--color-text))]`}>
                      {convo.user.display_name}
                    </h3>
                    <span className="text-xs text-[rgb(var(--color-text-secondary))]">
                      {new Date(convo.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${!convo.lastMessage.read && convo.lastMessage.recipient_id === user?.id ? 'text-[rgb(var(--color-text))] font-bold' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                    {convo.lastMessage.recipient_id === user?.id ? '' : 'You: '}{convo.lastMessage.content}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </motion.div>
  );
}