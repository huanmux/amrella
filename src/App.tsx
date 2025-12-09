import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, User, MessageSquare, Plus, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Assume this exists
import { Auth } from './components/Auth'; // Assume this exists
import Feed from './components/Feed'; // Assume this exists
import Profile from './components/Profile'; // Assume this exists (where Edit Profile would be)
import Messages from './components/Messages'; // Assume this exists
// I'll reintroduce the 'G' logo style from App_old.tsx for the desktop rail

// --- Navigation Config ---
const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: User, label: 'Profile', path: '/profile' },
];

// --- Components ---

const MobileNavBar = () => {
  const location = useLocation();
  // Using the minimal, pill-style nav from App_old.tsx
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[rgba(var(--color-surface),0.9)] backdrop-blur-md border-t border-[rgba(var(--color-border),0.5)] md:hidden">
      <div className="flex justify-around items-center h-20 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center justify-center w-full h-full relative group">
              {isActive && (
                // Pill animation from App_old.tsx
                <motion.div
                  layoutId="mobile-nav-pill"
                  className="absolute top-2 w-16 h-8 bg-[rgba(var(--color-primary),0.2)] rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`relative p-1 rounded-full transition-colors z-10 ${isActive ? 'text-[rgb(var(--color-text))]' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                {/* Icons from App_old.tsx style: no fill, varied strokeWidth */}
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-xs mt-1 font-medium z-10 ${isActive ? 'text-[rgb(var(--color-text))]' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Floating Plus button for mobile (optional, was in current) - kept the old structure for simplicity. The plus button wasn't explicitly in old, so I'll omit it to match the old design closer. If you wanted a mobile post button, the one from App_current.tsx was better. */}
    </div>
  );
};

const DesktopNavRail = () => {
  const { user, profile, signOut } = useAuth(); // Keeps real data
  const location = useLocation();

  return (
    <motion.div 
      initial={{ x: -100 }} // Animation from App_old.tsx
      animate={{ x: 0 }}
      className="hidden md:flex flex-col w-24 h-screen fixed left-0 top-0 border-r border-[rgba(var(--color-border),0.5)] bg-[rgba(var(--color-surface),0.5)] backdrop-blur-xl z-50 py-8 items-center" // Style from App_old.tsx
    >
      {/* Logo from App_old.tsx */}
      <Link to="/" className="mb-8 p-3 bg-[rgba(var(--color-primary),1)] rounded-xl text-[rgb(var(--color-text-on-primary))] shadow-lg shadow-[rgba(var(--color-primary),0.4)]">
        <span className="font-black text-xl">G</span>
      </Link>

      <div className="flex flex-col gap-4 w-full px-2">
        {/* Floating Post Button from App_old.tsx style */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mb-6 w-14 h-14 mx-auto bg-[rgb(var(--color-surface-hover))] rounded-2xl flex items-center justify-center text-[rgb(var(--color-text))] shadow-sm border border-[rgba(var(--color-border),0.5)]"
          // TODO: Add actual post creation logic here
          onClick={() => console.log('Open Post Modal')} 
        >
          <Plus size={24} />
        </motion.button>

        {/* Navigation Items from App_old.tsx style */}
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center gap-1 group relative w-full">
               <div className={`relative w-14 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${isActive ? 'bg-[rgba(var(--color-primary),0.3)]' : 'hover:bg-[rgba(var(--color-surface-hover),1)]'}`}>
                <item.icon 
                  size={24} 
                  className={`z-10 transition-colors ${isActive ? 'text-[rgb(var(--color-text))]' : 'text-[rgb(var(--color-text-secondary))]'}`} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-[rgb(var(--color-text))]' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      
      {/* Profile/Settings Area from App_old.tsx style, but with real data */}
      <div className="mt-auto flex flex-col items-center gap-4">
         {/* Sign Out Button (Reintroduced from App_current.tsx for functionality) */}
         <motion.button 
            onClick={signOut}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 flex items-center justify-center text-[rgb(var(--color-text-secondary))] hover:text-red-500 hover:bg-[rgba(255,0,0,0.1)] rounded-full transition-colors group"
         >
             <LogOut size={20} className="group-hover:text-red-500 transition-colors" />
         </motion.button>

         {/* Profile Avatar from App_old.tsx style, with real data */}
         <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))] p-0.5 cursor-pointer">
            <img 
                src={profile?.avatar_url || `https://i.pravatar.cc/150?u=${user?.id}`} 
                alt="User" 
                className="w-full h-full rounded-full object-cover border-2 border-[rgb(var(--color-background))]" 
            />
         </div>
      </div>
    </motion.div>
  );
};

// This is unchanged from App_current.tsx, as it handles the page transitions
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

// This is mostly from App_current.tsx to handle Auth and Theme
const MainLayout = () => {
  const { user, profile, loading } = useAuth();

  // Apply User Theme (from App_current.tsx)
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
        {/* Border is slightly softer to match App_old.tsx more closely */}
        <div className="max-w-4xl mx-auto min-h-screen border-x border-[rgba(var(--color-border),0.3)] bg-[rgba(var(--color-background),0.5)] shadow-2xl shadow-black/5">
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