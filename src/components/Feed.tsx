import { motion } from 'framer-motion'
import { Heart, MessageCircle, Repeat2, Share } from 'lucide-react'

const posts = Array(6).fill(null).map((_, i) => ({
  id: i,
  author: 'User' + i,
  avatar: '',
  content: 'Just vibing in the new Amrella update. This animation is insane!',
  time: '2h',
  likes: 128,
  comments: 32,
  reposts: 8,
})))

export default function Feed() {
  return (
    <div className="max-w-2xl mx-auto pt-8 px-4">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold mb-8 bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))] bg-clip-text text-transparent"
      >
        Home Feed
      </motion.h1>

      {posts.map((post, i) => (
        <motion.article
          key={post.id}
          layout
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ delay: i * 0.1 }}
          className="bg-[rgb(var(--color-surface))] rounded-3xl p-6 mb-6 border border-[rgb(var(--color-border))] shadow-sm"
        >
          <div className="flex gap-4">
            <motion.div
              whileHover={{ scale: 1.15 }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))] "
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[rgb(var(--color-text))]">{post.author}</h3>
                <span className="text-[rgb(var(--color-text-secondary))]">· {post.time}</span>
              </div>
              <p className="mt-3 text-[rgb(var(--color-text))]">{post.content}</p>

              <div className="flex gap-8 mt-6">
                {[
                  { Icon: Heart, count: post.likes, color: 'hover:text-red-500' },
                  { Icon: MessageCircle, count: post.comments },
                  { Icon: Repeat2, count: post.reposts, color: 'hover:text-green-500' },
                  { Icon: Share, count: 0 },
                ].map(({ Icon, count, color = '' }, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.3, y: -4 }}
                    whileTap={{ scale: 0.9 }}
                    className={`flex items-center gap-2 text-[rgb(var(--color-text-secondary))] ${color} transition-colors`}
                  >
                    <Icon size={20} />
                    {count > 0 && <span className="text-sm">{count}</span>}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  )
}