import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { MotionConfig } from 'framer-motion'

// Dynamic MUI 3 theme based on your CSS variables
const getDesignTokens = () => ({
  palette: {
    mode: document.documentElement.classList.contains('theme-amrella-dark') ? 'dark' : 'light',
    primary: {
      main: 'rgb(var(--color-primary))',
    },
    secondary: {
      main: 'rgb(var(--color-accent))',
    },
    background: {
      default: 'rgb(var(--color-background))',
      paper: 'rgb(var(--color-surface))',
    },
    text: {
      primary: 'rgb(var(--color-text))',
      secondary: 'rgb(var(--color-text-secondary))',
    },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
  },
})

const theme = createTheme(getDesignTokens())

// Re-create theme when user switches theme
const observer = new MutationObserver(() => {
  // @ts-ignore
  theme.palette = getDesignTokens().palette
})
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <MotionConfig reducedMotion="never">
        <App />
      </MotionConfig>
    </ThemeProvider>
  </React.StrictMode>
)