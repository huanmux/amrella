import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Feed from './components/Feed'
import Profile from './components/Profile'
import Messages from './components/Messages'

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/me" element={<Profile />} />
          <Route path="*" element={<Feed />} />
        </Routes>
      </MainLayout>
    </Router>
  )
}

export default App