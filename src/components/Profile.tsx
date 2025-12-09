import { motion } from 'framer-motion'
import { Edit2, MapPin, Link2, Calendar } from 'lucide-react'

export default function Profile() {
  return (
    <div className="max-w-4xl mx-auto pt-8 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-80 rounded-3xl overflow-hidden bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))] shadow-2xl"
      >
        <div className="absolute inset-0 bg-black/30" />
        <motion.div
          initial={{ scale: 1.4 }}
          animate={{ scale: 1 }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "reverse" }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1),transparent_70%)]"
        />
      </motion.div>

      <div className="relative -mt-20 px-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-40 h-40 rounded-full border-8 border-[rgb(var(--color-background))] bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))] shadow-xl"
        />

        <div className="mt-6">
          <h1 className="text-4xl font-bold text-[rgb(var(--color-text))]">Mahir Faisal</h1>
          <p className="text-[rgb(var(--color-text-secondary))]">@mahirfaisal</p>

          <p className="mt-4 text-lg text-[rgb(var(--color-text))] max-w-2xl">
            Full-stack dev • Building the most animated social platform ever • Currently in love with Framer Motion
          </p>

          <div className="flex gap-6 mt-4 text-[rgb(var(--color-text-secondary))]">
            <div className="flex items-center gap-2">
              <MapPin size={18} />
              <span>Dhaka, Bangladesh</span>
            </div>
            <div className="flex items-center gap-2">
              <Link2 size={18} />
              <span>mahir.dev</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              <span>Joined June 2024</span>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-full bg-[rgb(var(--color-primary))] text-[rgb(var(--color-text-on-primary))] font-semibold shadow-lg"
            >
              Follow
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-3 rounded-full border border-[rgb(var(--color-border))] "
            >
              <Edit2 size={20} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Posts grid will go here later */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Posts</h2>
        <div className="grid grid-cols-3 gap-4">
          {Array(9).fill(null).map((_, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.08, rotate: 2 }}
              className="aspect-square bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))] rounded-2xl opacity-80"
            />
          ))}
        </div>
      </div>
    </div>
  )
}