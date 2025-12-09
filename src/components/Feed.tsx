import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon, Plus } from 'lucide-react';

// Mock data simulating joins between `posts` and `profiles` tables
const POSTS = [
  { id: '1', user: 'Sarah Jen', handle: '@sarahj', content: 'Just finished the new design system for Gazebo! 🎨 ✨', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800', likes: 234, comments: 45 },
  { id: '2', user: 'Alex Rivier', handle: '@ariver', content: 'Hiking up the mountains this weekend. The view was absolutely breathtaking.', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800', likes: 892, comments: 120 },
  { id: '3', user: 'Code Daily', handle: '@codedaily', content: 'Remember: Consistency > Intensity. Keep shipping code every day.', image: null, likes: 1203, comments: 89 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0, scale: 0.95 },
  visible: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100 } }
};

export default function Feed() {
  const { scrollY } = useScroll();
  const headerY = useTransform(scrollY, [0, 50], [0, -50]);
  const headerOpacity = useTransform(scrollY, [0, 50], [1, 0]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0, x: -20 }}
      className="relative"
    >
      {/* Dynamic Header */}
      <motion.header 
        style={{ y: headerY, opacity: headerOpacity }}
        className="sticky top-0 z-40 p-4 backdrop-blur-xl bg-[rgba(var(--color-background),0.8)] border-b border-[rgba(var(--color-border),0.5)]"
      >
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[rgb(var(--color-text))] to-[rgba(var(--color-text),0.7)] bg-clip-text text-transparent">Home</h1>
      </motion.header>

      {/* Stories / Statuses Area (from `statuses` table) */}
      <div className="p-4 flex gap-3 overflow-x-auto pb-6 no-scrollbar">
        {[...Array(5)].map((_, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className={`w-16 h-16 rounded-full p-1 ${i === 0 ? 'border-2 border-dashed border-[rgb(var(--color-text-secondary))]' : 'bg-gradient-to-tr from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))]'}`}>
               <div className="w-full h-full rounded-full bg-[rgb(var(--color-surface))] border-2 border-[rgb(var(--color-background))] overflow-hidden relative">
                 <img src={`https://i.pravatar.cc/150?u=${i}`} alt="story" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                 {i === 0 && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Plus className="text-white" /></div>}
               </div>
            </div>
            <span className="text-xs font-medium text-[rgb(var(--color-text-secondary))]">User {i+1}</span>
          </motion.div>
        ))}
      </div>

      {/* Posts Feed */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 px-4 pb-24"
      >
        {POSTS.map((post) => (
          <motion.article 
            key={post.id}
            variants={itemVariants}
            className="bg-[rgb(var(--color-surface))] rounded-[28px] p-5 shadow-sm border border-[rgba(var(--color-border),0.4)] hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-3 items-center">
                <img src={`https://i.pravatar.cc/150?u=${post.handle}`} className="w-10 h-10 rounded-full" alt="avatar" />
                <div>
                  <h3 className="font-bold text-sm leading-tight">{post.user}</h3>
                  <p className="text-xs text-[rgb(var(--color-text-secondary))]">{post.handle} • 2h</p>
                </div>
              </div>
              <button className="p-2 rounded-full hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-secondary))]">
                <MoreHorizontal size={20} />
              </button>
            </div>

            <p className="text-[rgb(var(--color-text))] mb-4 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>

            {post.image && (
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="rounded-2xl overflow-hidden mb-4 border border-[rgba(var(--color-border),0.2)] aspect-video relative bg-gray-900"
              >
                <img src={post.image} alt="Post content" className="w-full h-full object-cover" loading="lazy" />
              </motion.div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[rgba(var(--color-border),0.3)]">
               <ActionButton icon={Heart} count={post.likes} activeColor="text-pink-500" />
               <ActionButton icon={MessageCircle} count={post.comments} activeColor="text-blue-500" />
               <ActionButton icon={Share2} count={null} activeColor="text-green-500" />
            </div>
          </motion.article>
        ))}
      </motion.div>
    </motion.div>
  );
}

const ActionButton = ({ icon: Icon, count, activeColor }: any) => (
  <motion.button 
    whileTap={{ scale: 0.8 }}
    className="flex items-center gap-2 py-2 px-3 rounded-full hover:bg-[rgb(var(--color-surface-hover))] group transition-colors"
  >
    <Icon size={20} className="text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))]" />
    {count && <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">{count}</span>}
  </motion.button>
);