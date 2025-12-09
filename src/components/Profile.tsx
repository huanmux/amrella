import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Link as LinkIcon, Calendar, Grid, Image, Heart } from 'lucide-react';

const TABS = [
  { id: 'posts', label: 'Posts', icon: Grid },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'likes', label: 'Likes', icon: Heart },
];

export default function Profile() {
  const [activeTab, setActiveTab] = useState('posts');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="pb-24"
    >
      {/* Banner */}
      <div className="h-48 md:h-64 bg-gradient-to-br from-[rgb(var(--color-primary))] to-purple-600 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200')] bg-cover bg-center mix-blend-overlay opacity-50"
        />
      </div>

      <div className="px-5 relative">
        {/* Avatar */}
        <div className="flex justify-between items-end -mt-16 mb-4">
           <motion.div 
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             transition={{ type: "spring", bounce: 0.4, delay: 0.2 }}
             className="w-32 h-32 rounded-full border-4 border-[rgb(var(--color-background))] bg-[rgb(var(--color-surface))] overflow-hidden shadow-lg"
           >
             <img src="https://i.pravatar.cc/300?u=me" alt="Profile" className="w-full h-full object-cover" />
           </motion.div>
           
           <motion.button 
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className="mb-2 px-6 py-2.5 rounded-full bg-[rgb(var(--color-text))] text-[rgb(var(--color-background))] font-bold text-sm shadow-lg"
           >
             Edit Profile
           </motion.button>
        </div>

        {/* Info */}
        <div className="space-y-3 mb-8">
          <div>
            <h1 className="text-2xl font-black">Huan Mux</h1>
            <p className="text-[rgb(var(--color-text-secondary))]">@huanmux</p>
          </div>
          
          <p className="text-[rgb(var(--color-text))] max-w-lg leading-relaxed">
            Digital architect & UI enthusiast. Building the future of social interaction at Gazebo. 🏗️ ✨
          </p>

          <div className="flex flex-wrap gap-4 text-sm text-[rgb(var(--color-text-secondary))]">
            <div className="flex items-center gap-1"><MapPin size={16} /> Dhaka, BD</div>
            <div className="flex items-center gap-1"><LinkIcon size={16} /> <a href="#" className="text-[rgb(var(--color-primary))] hover:underline">huanmux.dev</a></div>
            <div className="flex items-center gap-1"><Calendar size={16} /> Joined March 2021</div>
          </div>

          <div className="flex gap-4 pt-2">
            <div><span className="font-bold text-[rgb(var(--color-text))]">542</span> <span className="text-[rgb(var(--color-text-secondary))]">Following</span></div>
            <div><span className="font-bold text-[rgb(var(--color-text))]">12.5k</span> <span className="text-[rgb(var(--color-text-secondary))]">Followers</span></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 bg-[rgb(var(--color-background))] z-10 pt-2">
          <div className="flex border-b border-[rgba(var(--color-border),0.5)]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 relative py-4 flex flex-col items-center justify-center gap-2 group"
              >
                <span className={`text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-[rgb(var(--color-text))]' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute bottom-0 w-16 h-1 rounded-t-full bg-[rgb(var(--color-primary))]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className="absolute inset-0 bg-[rgba(var(--color-text),0.03)] opacity-0 group-hover:opacity-100 transition-opacity rounded-lg m-1" />
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[300px] py-6">
            <AnimatePresence mode='wait'>
                <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-3 gap-1"
                >
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="aspect-square bg-[rgb(var(--color-surface))] rounded-md overflow-hidden hover:opacity-90 cursor-pointer">
                             <img src={`https://picsum.photos/400?random=${i + (activeTab === 'media' ? 10 : 0)}`} alt="post" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </motion.div>
            </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}