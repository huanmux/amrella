// src/App.tsx
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Feed } from './components/Feed';
import { Messages } from './components/Messages';
import { Profile } from './components/Profile';
import { Search } from './components/Search';
import { Settings } from './components/Settings';
import { CustomPage } from './components/CustomPage';
import { Stats } from './components/Stats';
import { Status, StatusArchive } from './components/Status';
import { LeftSidebar, RightSidebar } from './components/Sidebar';
import { Notifications } from './components/Notifications'; 
import { Groups } from './components/Groups';
import { Forums } from './components/Forums';
import { Home, MessageSquare, User, LogOut, Search as SearchIcon, Bell, Menu } from 'lucide-react';
import { supabase } from './lib/supabase';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

type ViewType = 'feed' | 'messages' | 'profile' | 'settings' | 'page' | 'stats' | 'archive' | 'groups' | 'forums';

const SVG_PATH = "M214.59 81.627c-1.391 3.625-1.8 22.278-.673 30.713 2.126 15.91 7.978 28.209 18.377 38.625 8.015 8.028 16.264 12.279 25.192 12.984l6.987.551.656 4c.36 2.2.452 4.338.204 4.75s-16.119.75-35.27.75c-27.03 0-35.055.286-35.878 1.277-1.207 1.454-6.514 51.381-5.616 52.834.8 1.296 17.805 9.766 35.931 17.898C282.583 272.066 298.351 279 299.52 279c1.629 0 32.848-32.375 33.313-34.547.183-.855-3.275-12.669-7.685-26.253-4.409-13.585-9.509-29.425-11.333-35.2l-3.315-10.5-16.246.124c-8.935.068-17.598.395-19.25.725-2.964.593-3.003.545-2.96-3.624.055-5.301 2.307-11.827 4.661-13.505.987-.703 4.623-3.114 8.08-5.356 12.265-7.955 16.934-17.312 18.211-36.496.444-6.672 1.33-13.109 1.97-14.305 2.586-4.831.031-4.201-5.897 1.452-11.689 11.15-21.44 28.376-25.171 44.471-3.461 14.93-5.903 20.509-5.892 13.464.003-2.172.441-6.61.973-9.86 1.286-7.853-.23-18.167-3.736-25.418-3.789-7.836-13.052-16.799-31.473-30.456-8.538-6.33-15.831-12.005-16.206-12.612-.979-1.584-2.252-1.361-2.974.523M171 260.682c-1.375.268-2.882.854-3.35 1.302-.924.887 6.652 26.164 8.892 29.668.756 1.183 12.981 8.332 27.167 15.887 14.185 7.555 33.059 17.72 41.941 22.588l16.151 8.851 5.349-2.325c2.943-1.278 11.75-4.725 19.573-7.659l14.223-5.334 9.592-12.762c5.276-7.019 10.238-13.297 11.027-13.952 2.632-2.185 1.483-3.79-3.815-5.328-7.221-2.095-55.356-13.369-83.25-19.498-12.65-2.779-29.3-6.485-37-8.235-13.989-3.179-21.789-4.122-26.5-3.203m.504 71.312c-.227.367 1.087 2.896 2.921 5.618 2.958 4.392 10.6 17.779 22.909 40.126 2.192 3.981 5.859 9.156 8.147 11.5 6.4 6.555 44.639 29.762 49.04 29.762 2.295 0 25.842-9.216 26.714-10.456.404-.574.741-12.164.75-25.755l.015-24.712-3.75-.978c-11.319-2.952-18.565-4.671-44.377-10.53-15.605-3.542-35.929-8.421-45.165-10.841s-16.977-4.101-17.204-3.734"
const SVG_VIEWBOX = "0 0 500 500";

// --- SPECIAL EVENT CONFIG ---
export const SPECIAL_EVENT_MODE = false;
export const EVENT_MESSAGE = "⚡ SPECIAL EVENT (test): WELCOME TO LIAOVERSE! ENJOY THE VIBES! ⚡";
const EVENT_THEMES = ["https://huanmux.github.io/assets/audio/theme01.mp3", "https://huanmux.github.io/assets/audio/theme02.mp3"];

const Main = () => {
  const [view, setView] = useState<ViewType>('feed');
  const [showSidebar, setShowSidebar] = useState(false);
	const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [pageSlug, setPageSlug] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>();
  const [showSearch, setShowSearch] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>(); 
  
  const [pendingGazeboInvite, setPendingGazeboInvite] = useState<string | null>(null);
  const [pendingGazeboId, setPendingGazeboId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<'chats' | 'gazebos'>('chats');
  
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

// === Special Event Audio ===
  useEffect(() => {
    if (SPECIAL_EVENT_MODE) {
      const randomTrack = EVENT_THEMES[Math.floor(Math.random() * EVENT_THEMES.length)];
      const audio = new Audio(randomTrack);
      audio.volume = 0.3; // Polite volume
      // Browser policy requires interaction usually, this attempts to play on load
      audio.play().catch(e => console.log("Audio autoplay blocked until interaction"));
    }
  }, []);

  // === Notification State ===
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // === COMPREHENSIVE URL ROUTING ===
  useEffect(() => {
    const handleRouting = async () => {
      const path = location.pathname;
      const search = new URLSearchParams(location.search);
      
      // 1. Priority: Invite Codes (Takes over everything if present)
      const pathInviteMatch = path.match(/^\/invite\/([a-zA-Z0-9-]{3,20})$/);
      const queryInvite = search.get('invite');
      const inviteCode = pathInviteMatch ? pathInviteMatch[1] : queryInvite;

      if (inviteCode && user) {
        setPendingGazeboInvite(inviteCode);
        setView('messages');
        setInitialTab('gazebos');
        if (pathInviteMatch) navigate('/message', { replace: true }); 
        return;
      }

      // 2. Priority: Gazebos (Direct link to server)
      const pathGazeboMatch = path.match(/^\/gazebo\/?([a-zA-Z0-9-]{0,})?$/);
      const queryGazeboId = search.get('gazebo');
      const gazeboId = pathGazeboMatch ? pathGazeboMatch[1] : queryGazeboId;

      if ((gazeboId || pathGazeboMatch) && user) {
        setInitialTab('gazebos');
        if (gazeboId) setPendingGazeboId(gazeboId);
        setView('messages');
        if (pathGazeboMatch) window.history.replaceState({}, '', '/message');
        return;
      }

      // 3. Priority: Message User (Direct Message)
      const msgUser = search.get('user');
      if (path === '/message' && msgUser && user) {
          // We just handle the view here, the Messages component reads the URL param/event
          // But to ensure we load the conversation, we can trigger the internal navigation event if needed
          // or let the Messages component handle it via the URL param directly. 
          // Current Messages.tsx uses window event, let's bridge it if needed or rely on search param.
          // Note: The provided Messages.tsx doesn't read ?user= natively yet, it relies on 'openDirectMessage' event.
          // We will need to make sure we handle this in Messages or dispatch the event here.
          // For now, we will set the view. Messages.tsx should ideally read the param.
          
          // Dispatching event after a short delay to ensure Messages component is mounted
          const { data } = await supabase.from('profiles').select('*').eq('username', msgUser).single();
          if (data) {
             setTimeout(() => {
                 window.dispatchEvent(new CustomEvent('openDirectMessage', { detail: data }));
             }, 500);
          }
          setView('messages');
          return;
      }

      // 4. Priority: Status Deep Links
      const statusId = search.get('status');
      if (statusId && user) {
        const { data: statusData } = await supabase
          .from('statuses')
          .select('*, profiles!user_id(*)')
          .eq('id', statusId)
          .single();
        
        if (statusData) {
          const profileWithStatus = {
             ...statusData.profiles,
             statuses: [statusData],
             hasUnseen: false
          };
          window.dispatchEvent(new CustomEvent('openStatusViewer', {
             detail: {
               users: [profileWithStatus],
               initialUserId: statusData.user_id
             }
          }));
          setView('feed'); 
        }
        return;
      }

      // 5. Priority: Post Deep Links
      const postId = search.get('post');
      if (postId) {
         const { data: postData } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', postId)
            .maybeSingle(); 
         
         if (postData) {
             setSelectedProfileId(postData.user_id);
             setSelectedPostId(postId);
             setView('profile');
             return;
         }
      }

      // 6. Priority: User Profile (via root /?user=)
      // Only if we are at root AND have user param, OR path matches standard profile route if one existed
      const usernameQuery = search.get('user');
      if (path === '/' && usernameQuery) {
         const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', usernameQuery.toLowerCase())
            .single();
         if (data) {
            setSelectedProfileId(data.id);
            setView('profile');
            return;
         }
      }
      
      // 7. Priority: Standard Routes
      if (path === '/message') {
        setView('messages');
        return;
      }
      if (path === '/stats') {
        setView('stats');
        return;
      }
      
      // 8. Priority: Custom Page Slugs / Username Paths (More permissive regex)
      const slugMatch = path.match(/^\/([^/]+)\/?$/); // Matches anything that isn't a slash
      if (slugMatch) {
         const rawSlug = slugMatch[1];
         const slug = decodeURIComponent(rawSlug); // Handle spaces (%20) and special chars

         // Ignore reserved words
         if (!['user', 'invite', 'gazebo', 'message', 'stats', 'groups', 'forums', 'archive', 'settings'].includes(rawSlug.toLowerCase())) {
             
             // Try to find a user with this username first (Case Insensitive)
             const { data: profileData } = await supabase
                .from('profiles')
                .select('id')
                .ilike('username', slug) // Use ilike for case-insensitive match
                .maybeSingle();

             if (profileData) {
                 setSelectedProfileId(profileData.id);
                 setView('profile');
                 return;
             }

             // If no user found, assume it's a custom page
             setView('page');
             setPageSlug(slug);
             return;
         }
      }

      // Default
      if (path === '/') {
          // Handle /?user=... query param with decoded values and case-insensitivity
          if (usernameQuery) {
             const decodedUsername = decodeURIComponent(usernameQuery);
             const { data } = await supabase
                .from('profiles')
                .select('id')
                .ilike('username', decodedUsername)
                .maybeSingle();
             
             if (data) {
                setSelectedProfileId(data.id);
                setView('profile');
                return;
             }
          }

          setView('feed');
          setSelectedProfileId(undefined);
          setSelectedPostId(undefined);
      }

    };
    
    handleRouting();

  }, [location.pathname, location.search, user, navigate]);


  // Set theme from profile
  useEffect(() => {
    if (profile?.theme) {
      document.body.className = `theme-${profile.theme}`;
    }
  }, [profile?.theme]);

  // === Notification Fetching and Realtime ===
  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('read', false);
      setUnreadMessages(msgCount || 0);

      try {
        const { count: notifCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false);
        setUnreadNotifications(notifCount || 0);
      } catch (error) {
        console.warn("Could not fetch notifications.");
      }
    };

    fetchCounts();

    // NEW: Listen for the custom event dispatched from Messages.tsx
    const handleMessagesRead = () => {
        fetchCounts();
    };
    window.addEventListener('messagesRead', handleMessagesRead);

    const channel = supabase.channel(`user-notifications:${user.id}`);
    
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `recipient_id=eq.${user.id}`
    }, (payload) => {
      if (payload.new.read === false) {
        setUnreadMessages(c => c + 1);
      }
    });

    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `recipient_id=eq.${user.id}`
    }, (payload) => {
      // OPTIMIZED: If we can detect a read status change locally, update state immediately
      // Note: payload.old usually only has ID unless Replica Identity is set to Full.
      // So we still fallback to fetchCounts for accuracy, but the window event listener above
      // handles the immediate user interaction case.
      fetchCounts();
    });

    // ... (keep the notifications channel listeners below exactly as they were) ...
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${user.id}`
    }, () => {
      setUnreadNotifications(n => n + 1);
    });

    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${user.id}`
    }, (payload) => {
      if (payload.old.is_read === false && payload.new.is_read === true) {
        setUnreadNotifications(n => Math.max(0, n - 1));
      }
    });
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('messagesRead', handleMessagesRead); // Clean up new listener
    };

  }, [user]);

  // Keep internal navigation working
  useEffect(() => {
    const handler = (e: any) => {
      const profileId = e.detail;
      supabase
        .from('profiles')
        .select('username')
        .eq('id', profileId)
        .single()
        .then(({ data }) => {
          if (data) {
            navigate(`/?user=${data.username}`);
            setSelectedProfileId(profileId);
            setView('profile');
          }
        });
    };
    window.addEventListener('navigateToProfile', handler);
    return () => window.removeEventListener('navigateToProfile', handler);
  }, [navigate]);

  // === ONLINE STATUS UPDATE ===
  useEffect(() => {
    if (!user) return;
    const updateLastSeen = async () => {
      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id);
    };
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
        <div
            className="min-h-screen bg-[rgb(var(--color-background))] flex flex-col items-center justify-center text-2xl font-bold text-[rgb(var(--color-text))]"
            style={{
                background: `linear-gradient(to bottom right, rgba(var(--color-surface),0.05), rgba(var(--color-primary),0.05))`,
            }}
        >
            <div className="logo-loading-container w-[150px] h-auto relative mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox={SVG_VIEWBOX} className="logo-svg">
                    <defs>
                        <clipPath id="logo-clip"><rect id="clip-rect" x="0" y="0" width="100%" height="100%" /></clipPath>
                    </defs>
                    <path d={SVG_PATH} fill="none" stroke="rgb(var(--color-primary))" strokeWidth="10" strokeOpacity="0.1" />
                    <path d={SVG_PATH} fill="rgb(var(--color-primary))" clipPath="url(#logo-clip)" className="logo-fill-animated" />
                </svg>
            </div>
            Loading...
        </div>
    );
  }

  if (view === 'page' && pageSlug) return <CustomPage slug={pageSlug} />;
  if (view === 'stats') return <Stats />;

  if (!user || !profile) {
    if (view === 'profile' && selectedProfileId) {
      return (
	     <div className="min-h-screen bg-[rgb(var(--color-background))]">
          <div className="bg-[rgb(var(--color-surface))] border-b border-[rgb(var(--color-border))] sticky top-0 z-50 shadow-sm">
            <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox={SVG_VIEWBOX} className="w-[32px] h-[32px] cursor-pointer" onClick={() => navigate('/')}>
                <path d={SVG_PATH} fill="rgb(var(--color-primary))" />
              </svg>
              <a href="/" className="text-[rgb(var(--color-primary))] hover:text-[rgba(var(--color-primary),0.8)] font-bold">← Back to Home</a>
            </div>
          </div>
          <Profile userId={selectedProfileId} initialPostId={selectedPostId} />
        </div>
      );
    }
    if (view === 'messages') return <Auth />;
    return <Auth />;
  }

const handleMessageUser = (targetProfile: any) => {
    setView('messages');
    setSelectedProfileId(undefined);
    // Update URL first
    navigate(`/message?user=${targetProfile.username}`);
    // Dispatch event so Messages component picks it up immediately without refresh
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openDirectMessage', { detail: targetProfile }));
    }, 100);
  };

  const handleSettings = () => {
    setView('settings');
    setSelectedProfileId(undefined);
  };
  
  const handleNotificationsClick = async () => {
    setShowNotifications(true); 
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
      setUnreadNotifications(0);
    } catch (error) { console.warn("Could not mark notifications as read."); }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--color-background))]">
      {/* 4a. RENDER SIDEBARS */}
	<LeftSidebar 
        show={showLeftSidebar} 
        onClose={() => setShowLeftSidebar(false)} 
      />
      <RightSidebar 
        show={showSidebar} 
        onClose={() => setShowSidebar(false)} 
        setView={setView} 
        view={view}
        onSignOut={signOut} 
      />

      <nav className="bg-[rgb(var(--color-surface))] border-b border-[rgb(var(--color-border))] sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          {/* 4b. UPDATE LOGO ONCLICK */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox={SVG_VIEWBOX} 
            className="w-[32px] h-[32px] cursor-pointer" 
			onClick={() => setShowLeftSidebar(true)}
          >
            <path d={SVG_PATH} fill="rgb(var(--color-primary))" />
          </svg>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSearch(true)} className="p-3 rounded-full hover:bg-[rgb(var(--color-surface-hover))] transition">
              <SearchIcon size={20} className="text-[rgb(var(--color-text-secondary))]" />
            </button>
            <button onClick={() => { setView('feed'); setSelectedProfileId(undefined); setSelectedPostId(undefined); navigate('/'); }} className={`p-3 rounded-full transition ${view === 'feed' ? 'bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))]' : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-secondary))]'}`}>
              <Home size={20} />
            </button>
            <button onClick={() => { setView('messages'); setSelectedProfileId(undefined); setSelectedPostId(undefined); navigate('/message'); }} className={`relative p-3 rounded-full transition ${view === 'messages' ? 'bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))]' : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-secondary))]'}`}>
              <MessageSquare size={20} />
              {unreadMessages > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
            </button>
			      <button onClick={handleNotificationsClick} className="relative p-3 rounded-full hover:bg-[rgb(var(--color-surface-hover))] transition">
              <Bell size={20} className="text-[rgb(var(--color-text-secondary))]" />
              {unreadNotifications > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
            </button>
            <button onClick={() => { if (!profile?.username) return; navigate(`/?user=${profile.username}`); setSelectedProfileId(undefined); setView('profile'); }} className={`p-3 rounded-full transition ${view === 'profile' && !selectedProfileId ? 'bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))]' : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-secondary))]'}`}>
              <User size={20} />
            </button>
			<button onClick={() => setShowSidebar(true)} className="p-3 rounded-full hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-secondary))] transition">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="h-[90vh] overflow-auto">
        {view === 'feed' && <Feed />}
        {view === 'messages' && (
		    <Messages 
		        initialInviteCode={pendingGazeboInvite} 
		        onInviteHandled={() => setPendingGazeboInvite(null)} 
		        initialTab={initialTab}
		        initialGazeboId={pendingGazeboId}
		    />
		)}
        {view === 'profile' && (
          <Profile 
            key={selectedProfileId || 'own-profile'} // Force remount if profile changes
            userId={selectedProfileId} 
            initialPostId={selectedPostId} // This triggers the modal in Profile.tsx
            onMessage={handleMessageUser} 
            onSettings={!selectedProfileId || selectedProfileId === user.id ? handleSettings : undefined} 
          />
        )}
        {view === 'settings' && <Settings />}
        {showNotifications && <Notifications onClose={() => setShowNotifications(false)} />}
        {showSearch && <Search onClose={() => setShowSearch(false)} />}
        {view === 'stats' && user && <Stats />}
		  {view === 'groups' && <Groups setView={setView} />}
		  {view === 'forums' && <Forums />}
		  {view === 'archive' && <StatusArchive />}
      </main>
      {view !== 'messages' && (
        <footer className="text-center text-[rgb(var(--color-text-secondary))] text-xs py-4 border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
          © Mux {new Date().getFullYear()}
        </footer>
       )}

	{/* SPECIAL EVENT MARQUEE */}
       {SPECIAL_EVENT_MODE && (
         <div className="fixed bottom-0 left-0 w-full bg-black text-white z-[100] h-8 flex items-center overflow-hidden border-t border-[rgb(var(--color-accent))]">
           <div className="whitespace-nowrap animate-marquee font-bold uppercase tracking-widest text-sm">
             {EVENT_MESSAGE} &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; {EVENT_MESSAGE} &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; {EVENT_MESSAGE}
           </div>
         </div>
       )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Main />
		    <Status />
        <Analytics/>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
