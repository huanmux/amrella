import { motion } from 'framer-motion'
import Navbar from '../Navbar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[rgb(var(--color-background))]">
      <Navbar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex-1 pb-20 md:pb-0"
      >
        {children}
      </motion.main>
    </div>
  )
}