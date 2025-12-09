import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, User, MessageSquare, Plus, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import Feed from './components/Feed';
import Profile from './components/Profile';
import Messages from './components/Messages';

// --- Navigation Config ---
const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: User, label: 'Profile', path: '/profile' },
];

// --- Components ---

const MobileNavBar = () => {
  const location = useLocation();
  const { user, profile } = useAuth();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[rgba(var(--color-surface),0.9)] backdrop-blur-md border-t border-[rgba(var(--color-border),0.5)] md:hidden">
      <div className="flex justify-around items-center h-20 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center justify-center w-full h-full relative group">
              {isActive && (
                <motion.div 
                  layoutId="mobile-nav-active" 
                  className="absolute inset-0 bg-[rgba(var(--color-primary),0.1)] rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon 
                size={24} 
                className={`z-10 transition-colors ${isActive ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))]'}`} 
                fill={isActive ? 'currentColor' : 'none'}
              />
              <span className={`text-xs mt-1 z-10 transition-colors ${isActive ? 'text-[rgb(var(--color-primary))] font-bold' : 'text-[rgb(var(--color-text-secondary))]'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 w-16 h-16 bg-[rgb(var(--color-primary))] rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
        <Plus size={28} className="text-[rgb(var(--color-text-on-primary))]" />
      </div>
    </div>
  );
};

const DesktopNavRail = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  return (
    <motion.div 
      initial={{ x: -60, opacity: 0 }} 
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 bottom-0 z-50 w-24 bg-[rgba(var(--color-surface),0.9)] backdrop-blur-md hidden md:flex flex-col justify-between items-center py-6 border-r border-[rgba(var(--color-border),0.5)]"
    >
      <div className="flex flex-col items-center gap-10">
        {/* UPDATED LOGO: Replaced 'G' with Amrella image */}
        <Link to="/" className="w-12 h-12 flex items-center justify-center">
            <img 
                src="https://huanmux.github.io/assets/logo/amrella-home.png" 
                alt="Amrella Logo" 
                className="w-full h-full object-contain" 
            />
        </Link>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="w-16 h-16 flex items-center justify-center relative group">
              {isActive && (
                <motion.div 
                  layoutId="desktop-nav-active" 
                  className="absolute inset-0 bg-[rgba(var(--color-primary),0.1)] rounded-2xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon 
                size={28} 
                className={`z-10 transition-colors ${isActive ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-primary))]'}`} 
                fill={isActive ? 'currentColor' : 'none'}
              />
              <span className="absolute left-full ml-4 whitespace-nowrap text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded bg-[rgb(var(--color-surface-hover))] shadow-xl pointer-events-none">
                {item.label}
              </span>
            </Link>
          );
        })}
        
        {/* Floating Post Button */}
        <div className="w-16 h-16 bg-gradient-to-br from-[rgb(var(--color-primary))] to-purple-600 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
          <Plus size={32} className="text-[rgb(var(--color-text-on-primary))]" />
        </div>
      </div>
      
      {/* Profile/Settings Area */}
      <div className="flex flex-col items-center gap-4">
         <motion.button 
            onClick={signOut}
            whileTap={{ scale: 0.95 }}
            className="w-16 h-16 flex items-center justify-center text-[rgb(var(--color-text-secondary))] hover:text-red-500 hover:bg-[rgba(255,0,0,0.1)] rounded-2xl transition-colors group"
         >
             <LogOut size={28} className="group-hover:text-red-500 transition-colors" />
         </motion.button>

         <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))] p-0.5 cursor-pointer">
            <img src={profile?.avatar_url || `https://i.pravatar.cc/150?u=${user?.id}`} alt="User" className="w-full h-full rounded-full object-cover border-2 border-[rgb(var(--color-background))] object-cover" />
         </div>
      </div>
    </motion.div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Feed />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/messages" element={<Messages />} />
      </Routes>
    </AnimatePresence>
  );
};

const MainLayout = () => {
  const { user, profile, loading } = useAuth();

  // Apply User Theme
  useEffect(() => {
    if (profile?.theme) {
      document.documentElement.className = `theme-${profile.theme}`;
    } else {
      document.documentElement.className = 'theme-amrella-dark';
    }
  }, [profile?.theme]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[rgb(var(--color-background))] text-[rgb(var(--color-primary))]" data-testid="app-loading">
         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--color-background))] text-[rgb(var(--color-text))] font-sans selection:bg-[rgba(var(--color-primary),0.3)]">
      <DesktopNavRail />
      <main className="md:pl-24 pb-20 md:pb-0 min-h-screen relative overflow-hidden">
        <div className="max-w-4xl mx-auto min-h-screen border-x border-[rgba(var(--color-border),0.5)]">
          <AnimatedRoutes />
        </div>
      </main>
      <MobileNavBar />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}