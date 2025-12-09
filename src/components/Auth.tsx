import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, AlertCircle, RefreshCw, X, CheckCircle, User, Mail, Lock, HeartHandshake } from 'lucide-react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  useTheme,
  createTheme,
  ThemeProvider,
  styled,
} from '@mui/material';

// ----------------------------------------------------------------------
// 1. MATERIAL DESIGN 3 THEME
// ----------------------------------------------------------------------

// The main color palette (M3 uses primary/secondary/tertiary)
const PRIMARY_COLOR = '#65f09d'; // Main Color
const ACCENT_SECONDARY = '#75ffa4'; // Accent 1
const ACCENT_TERTIARY = '#24d1a7'; // Accent 2

const customTheme = createTheme({
  palette: {
    // Define the primary palette with the main color
    primary: {
      main: PRIMARY_COLOR,
      // You can define light/dark/contrastText based on your specific M3 needs
      light: ACCENT_SECONDARY,
      dark: ACCENT_TERTIARY,
      contrastText: '#000',
    },
    // Define the secondary palette with an accent color
    secondary: {
      main: ACCENT_SECONDARY,
      contrastText: '#000',
    },
    // Define the tertiary palette with the other accent color
    tertiary: {
      main: ACCENT_TERTIARY,
      contrastText: '#000',
    },
    error: {
      main: '#FF5252',
    },
    success: {
      main: '#4CAF50',
    },
    background: {
      default: '#F5F5F5', // Light background for the overall page
      paper: '#FFFFFF',   // Card background
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif', // Use a standard font or your custom font
    h4: {
      fontWeight: 900, // Black
    },
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          // M3 style for text fields: filled/outlined with color on focus
          '& .MuiOutlinedInput-root': {
            borderRadius: '16px', // Rounded corners
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            '&.Mui-focused fieldset': {
              borderColor: PRIMARY_COLOR,
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: '16px',
          fontWeight: 'bold',
          padding: '16px 24px',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'scale(1.01)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        containedPrimary: {
          // Custom shadow/gradient for the main button
          background: `linear-gradient(90deg, #FF6B6B 0%, #FFA726 100%)`, // Replicating the red-orange gradient
          '&:hover': {
            background: `linear-gradient(90deg, #FF5252 0%, #FF9800 100%)`,
          },
          boxShadow: '0 8px 16px 0 rgba(255, 107, 107, 0.4)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '24px', // Rounded card corners (M3 large radius)
          padding: '40px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)', // Semi-transparent card
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '24px',
          maxWidth: '900px',
          height: '90vh',
        },
      },
    },
  },
});

// ----------------------------------------------------------------------
// 2. STYLED COMPONENTS (For Animated Background)
// ----------------------------------------------------------------------

// Replicating the wave animation container as a styled component
const AnimatedBackground = styled(Box)(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  zIndex: -1,
  // Animation keyframes (kept from original logic)
  '& .animate-wave1': {
    animation: 'wave1 20s ease-in-out infinite',
  },
  '& .animate-wave2': {
    animation: 'wave2 25s ease-in-out infinite',
  },
  '& .animate-wave3': {
    animation: 'wave3 30s ease-in-out infinite',
  },
  '@keyframes wave1': {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-40px)' },
  },
  '@keyframes wave2': {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(60px)' },
  },
  '@keyframes wave3': {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-80px)' },
  },
}));

// ----------------------------------------------------------------------
// 3. POLICY MODAL (Now a MUI Dialog)
// ----------------------------------------------------------------------

const PolicyModal = ({ isOpen, title, slug, onClose }) => {
  const theme = useTheme();
  const contentUrl = `/${slug}`;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      PaperProps={{
        style: {
          height: '90vh',
          borderRadius: '24px', // Use theme styling
        }
      }}
      TransitionProps={{
        // Custom transition for a smoother appearance
        timeout: 300,
        appear: true,
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.palette.error.light, // Use a contrasting color for the header
          color: theme.palette.error.contrastText,
          padding: '24px',
          borderBottom: `1px solid ${theme.palette.error.dark}`,
          m: 0
        }}
      >
        <Typography variant="h4" component="span" sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: theme.palette.error.contrastText,
            '&:hover': {
              backgroundColor: theme.palette.error.main,
            },
          }}
          aria-label="Close modal"
        >
          <X size={24} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, flexGrow: 1 }}>
        <Box sx={{ width: '100%', height: '100%' }}>
          {/* Using an iframe to load the content from the relative slug path */}
          <iframe
            src={contentUrl}
            title={title}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ----------------------------------------------------------------------
// 4. MAIN AUTH COMPONENT
// ----------------------------------------------------------------------

export const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signIn } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSlug, setModalSlug] = useState('');

  useEffect(() => {
    setError('');
  }, [email, password, username, displayName]);

  // Modal handler functions
  const openModal = (title, slug) => {
    setModalTitle(title);
    setModalSlug(slug);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalTitle('');
    setModalSlug('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!username.trim()) { setError('Username is required'); setIsLoading(false); return; }
        if (!displayName.trim()) { setError('Display name is required'); setIsLoading(false); return; }
        if (username.includes(' ')) { setError('Username cannot contain spaces'); setIsLoading(false); return; }

        await signUp(email, password, username, displayName);
        setSuccess(true);
        setTimeout(() => {
          setIsSignUp(false);
          setEmail('');
          setPassword('');
          setUsername('');
          setDisplayName('');
          setSuccess(false);
        }, 1800);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      const message = err.message?.toLowerCase() || '';
      if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
        setError('Wrong email or password. Please try again.');
      } else if (message.includes('email not confirmed')) {
        setError('Please check your email and click the confirmation link.');
      } else if (message.includes('user already registered') || message.includes('already exists')) {
        setError('An account with this email already exists. Try signing in.');
      } else if (message.includes('password should be at least')) {
        setError('Password must be at least 6 characters long.');
      } else if (message.includes('unable to validate email address')) {
        setError('Please enter a valid email address.');
      } else if (message.includes('rate limit') || message.includes('too many requests')) {
        setError('Too many attempts. Please wait a minute and try again.');
      } else if (message.includes('network') || message.includes('fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider theme={customTheme}>
      <Container
        maxWidth={false}
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ANIMATED WAVE BACKGROUND (Retained original SVG logic within MUI Box) */}
        <AnimatedBackground>
          <svg
            style={{ width: '100%', height: '100%' }}
            viewBox="0 0 1440 1024"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff6b6b" />
                <stop offset="50%" stopColor="#ffa726" />
                <stop offset="100%" stopColor="#ff8a65" />
              </linearGradient>
              <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff5252" />
                <stop offset="50%" stopColor="#ff9800" />
                <stop offset="100%" stopColor="#ff6b6b" />
              </linearGradient>
              <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff3d00" />
                <stop offset="50%" stopColor="#ff6d00" />
                <stop offset="100%" stopColor="#ff9100" />
              </linearGradient>
            </defs>
            {/* Wave paths with classNames for CSS animation */}
            <path fill="url(#grad1)" fillOpacity="0.6" d="M0,160 C320,300 1120,50 1440,160 L1440,1024 L0,1024 Z" className="animate-wave1">
              <animate attributeName="d" values="M0,160 C320,300 1120,50 1440,160 L1440,1024 L0,1024 Z;M0,200 C380,50 1060,350 1440,180 L1440,1024 L0,1024 Z;M0,160 C320,300 1120,50 1440,160 L1440,1024 L0,1024 Z" dur="20s" repeatCount="indefinite" />
            </path>
            <path fill="url(#grad2)" fillOpacity="0.5" d="M0,300 C280,100 1160,400 1440,280 L1440,1024 L0,1024 Z" className="animate-wave2">
              <animate attributeName="d" values="M0,300 C280,100 1160,400 1440,280 L1440,1024 L0,1024 Z;M0,250 C350,450 1090,-50 1440,320 L1440,1024 L0,1024 Z;M0,300 C280,100 1160,400 1440,280 L1440,1024 L0,1024 Z" dur="25s" repeatCount="indefinite" />
            </path>
            <path fill="url(#grad3)" fillOpacity="0.4" d="M0,450 C300,600 1140,200 1440,400 L1440,1024 L0,1024 Z" className="animate-wave3">
              <animate attributeName="d" values="M0,450 C300,600 1140,200 1440,400 L1440,1024 L0,1024 Z;M0,500 C250,200 1190,700 1440,350 L1440,1024 L0,1024 Z;M0,450 C300,600 1140,200 1440,400 L1440,1024 L0,1024 Z" dur="30s" repeatCount="indefinite" />
            </path>
          </svg>
        </AnimatedBackground>

        {/* AUTH CARD */}
        <Paper elevation={10} sx={{ width: '100%', maxWidth: '480px', zIndex: 10 }}>
          <Box textAlign="center" mb={5}>
            <img
              src="https://huanmux.github.io/assets/logo/amrella-mango.svg"
              alt="Amrella logo"
              style={{ margin: '0 auto', width: '100px', height: '100px', marginBottom: '8px' }}
            />
            <Typography variant="h4" color="text.secondary">
              Amrella
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {isSignUp && (
                <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ mb: -2 }}>
                  By creating an account you agree to the{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={() => openModal('Terms of Service', 'terms-of-service')}
                    color="error"
                    sx={{ fontWeight: 'bold' }}
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={() => openModal('Privacy Policy', 'privacy-policy')}
                    color="error"
                    sx={{ fontWeight: 'bold' }}
                  >
                    Privacy Policy
                  </Link>
                </Typography>
              )}
              {isSignUp && (
                <>
                  <TextField
                    label="Username (no spaces)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                    InputProps={{
                      startAdornment: <User color="action" style={{ marginRight: 8 }} />,
                    }}
                  />
                  <TextField
                    label="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    disabled={isLoading}
                    InputProps={{
                      startAdornment: <HeartHandshake color="action" style={{ marginRight: 8 }} />,
                    }}
                  />
                </>
              )}

              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                InputProps={{
                  startAdornment: <Mail color="action" style={{ marginRight: 8 }} />,
                }}
              />

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                InputProps={{
                  startAdornment: <Lock color="action" style={{ marginRight: 8 }} />,
                }}
              />

              <Box sx={{ minHeight: '64px', mt: 1 }}>
                {error && (
                  <Paper
                    elevation={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      backgroundColor: 'error.main',
                      color: 'error.contrastText',
                      border: '2px solid',
                      borderColor: 'error.dark',
                      borderRadius: '12px',
                    }}
                  >
                    <AlertCircle size={22} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {error}
                    </Typography>
                  </Paper>
                )}
                {success && (
                  <Paper
                    elevation={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      backgroundColor: 'success.main',
                      color: 'success.contrastText',
                      border: '2px solid',
                      borderColor: 'success.dark',
                      borderRadius: '12px',
                    }}
                  >
                    <CheckCircle size={22} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      Account created! Switching to Sign In...
                    </Typography>
                  </Paper>
                )}
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                color="primary"
                disabled={isLoading}
                startIcon={
                  isLoading ? (
                    <CircularProgress color="inherit" size={24} />
                  ) : (
                    <LogIn size={28} />
                  )
                }
              >
                {isLoading ? 'Loading...' : (isSignUp ? 'Join Amrella' : 'Enter Amrella')}
              </Button>
            </Box>
          </form>

          <Box mt={4} textAlign="center">
            <Button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess(false);
              }}
              disabled={isLoading}
              sx={{
                color: 'error.main', // Using error palette for the switch link color
                fontWeight: 'bold',
                fontSize: '1.125rem',
                textTransform: 'none',
                p: 0,
                '&:hover': {
                  backgroundColor: 'transparent',
                  textDecoration: 'underline',
                },
              }}
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </Button>
          </Box>

          <Typography variant="caption" color="text.disabled" mt={5} textAlign="center" display="block" fontWeight="bold">
            © Mux {new Date().getFullYear()}
          </Typography>
        </Paper>

        <PolicyModal isOpen={isModalOpen} title={modalTitle} slug={modalSlug} onClose={closeModal} />
      </Container>
    </ThemeProvider>
  );
};