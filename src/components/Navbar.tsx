import { motion } from 'framer-motion'
import { Home, MessageCircle, User, Search, Settings, Sparkles } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { icon: Home, label: 'Feed', path: '/' },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
  { icon: User, label: 'Profile', path: '/me' },
  { icon: Search, label: 'Explore', path: '/explore' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 backdrop-blur-20 bg-[rgba(var(--color-surface),0.8)] border-b border-[rgb(var(--color-border))]"
    >
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo with animated fill */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer"
        >
          <svg width="40" height="40" viewBox="0 0 0 100 100" className="drop-shadow-lg">
            <defs>
              <clipPath id="clip">
                <rect id="clip-rect" x="0" y="0" width="100" height="100" />
              </clipPath>
            </defs>
            <g clipPath="url(#clip)">
              <path
                fill="rgb(var(--color-primary))"
                d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z"
              />
              <path
                fill="rgb(var(--color-accent))"
                d="M50 25 L75 37.5 L75 62.5 L50 75 L25 62.5 L25 37.5 Z"
              />
            </g>
          </svg>
          <span className="text-2xl font-bold bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))] bg-clip-text text-transparent">
            Amrella
          </span>
        </motion.div>

        {/* Nav Items */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <motion.button
                key={item.path}
                whileHover={{ scale: 1.1, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(item.path)}
                className={`relative p-3 rounded-2xl transition-all ${
                  isActive
                    ? 'text-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.1)]'
                    : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface-hover)]'
                }`}
              >
                <Icon size={24} />
                {isActive && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute inset-0 rounded-2xl bg-[rgba(var(--color-primary),0.15)] -z-10"
                  />
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="flex gap-2 items-center px-5 py-2.5 rounded-full bg-[rgb(var(--color-primary))] text-[rgb(var(--color-text-on-primary))] font-medium shadow-lg"
          >
            <Sparkles size={18} />
            Create
          </motion.button>
        </div>
      </div>
    </motion.nav>
  )
}