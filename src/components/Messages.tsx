import React from 'react';
import { motion } from 'framer-motion';
import { Search, Edit } from 'lucide-react';

const MESSAGES = [
  { id: 1, name: 'Design Team', message: 'Hey! Are we still on for the review?', time: '2m', unread: 2 },
  { id: 2, name: 'Sarah Jen', message: 'Sent you the files.', time: '1h', unread: 0 },
  { id: 3, name: 'Mom', message: 'Call me when you can.', time: '3h', unread: 1 },
  { id: 4, name: 'Project X', message: 'New deployment is live 🚀', time: '1d', unread: 0 },
  { id: 5, name: 'Alex Rivier', message: 'Thanks for the help!', time: '2d', unread: 0 },
];

export default function Messages() {
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
          {MESSAGES.map((msg) => (
            <motion.li
              key={msg.id}
              variants={{
                hidden: { x: -20, opacity: 0 },
                visible: { x: 0, opacity: 1 }
              }}
              whileHover={{ scale: 1.01, backgroundColor: 'rgba(var(--color-surface-hover), 1)' }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors"
            >
              <div className="relative">
                <img src={`https://i.pravatar.cc/150?u=${msg.name}`} className="w-12 h-12 rounded-full object-cover bg-gray-200" alt={msg.name} />
                {msg.unread > 0 && (
                   <div className="absolute -top-1 -right-1 w-5 h-5 bg-[rgb(var(--color-primary))] border-2 border-[rgb(var(--color-background))] rounded-full flex items-center justify-center text-[10px] font-bold text-[rgb(var(--color-text-on-primary))]">
                     {msg.unread}
                   </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`text-sm truncate ${msg.unread ? 'font-bold text-[rgb(var(--color-text))]' : 'font-medium text-[rgb(var(--color-text))]'}`}>
                    {msg.name}
                  </h3>
                  <span className={`text-xs ${msg.unread ? 'text-[rgb(var(--color-primary))] font-bold' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                    {msg.time}
                  </span>
                </div>
                <p className={`text-xs truncate ${msg.unread ? 'text-[rgb(var(--color-text))] font-medium' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                  {msg.message}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </motion.div>
  );
}