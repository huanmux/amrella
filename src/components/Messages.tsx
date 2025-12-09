import { motion } from 'framer-motion'
import { Search, Phone, Video, MoreVertical } from 'lucide-react'

const chats = Array(10).fill(null).map((_, i) => ({
  id: i,
  name: 'Friend ' + (i + 1),
  lastMsg: 'Yo! Check this out',
  time: '5 min',
  unread: i < 3 ? i + 1 : 0,
}))

export default function Messages() {
  return (
    <div className="max-w-5xl mx-auto flex h-[calc(100vh-5rem)]">
      {/* Chat List */}
      <motion.div
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-96 border-r border-[rgb(var(--color-border))] flex flex-col"
      >
        <div className="p-6 border-b border-[rgb(var(--color-border))]">
          <h2 className="text-2xl font-bold">Messages</h2>
          <div className="mt-4 relative">
            <Search className="absolute left-4 top-3 text-[rgb(var(--color-text-secondary))]" size={20} />
            <input
              type="text"
              placeholder="Search chats..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-[rgb(var(--color-surface-hover))] focus:outline-none focus:ring-4 ring-[rgba(var(--color-primary),0.3)] transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <motion.div
              key={chat.id}
              whileHover={{ backgroundColor: 'rgb(var(--color-surface-hover))' }}
              className="flex items-center gap-4 p-4 cursor-pointer border-b border-[rgb(var(--color-border))]/30"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))]" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <h4 className="font-semibold">{chat.name}</h4>
                  <span className="text-sm text-[rgb(var(--color-text-secondary))]">{chat.time}</span>
                </div>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] truncate">{chat.lastMsg}</p>
              </div>
              {chat.unread > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-[rgb(var(--color-primary))] text-xs flex items-center justify-center text-[rgb(var(--color-text-on-primary))] font-bold"
                >
                  {chat.unread}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Chat Window Placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))] opacity-20 blur-3xl" />
          <h3 className="text-3xl font-bold mb-4">Select a chat to start messaging</h3>
          <p className="text-[rgb(var(--color-text-secondary))]">Your messages are end-to-end encrypted</p>
        </motion.div>
      </div>
    </div>
  )
}