import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Landing from './pages/Landing.jsx'
import Services from './pages/Services.jsx'
import About from './pages/About.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Profile from './pages/Profile.jsx'
import OptionsLanding from './pages/OptionsLanding.jsx'
import OptionsChainPage from './pages/OptionsChainPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/options"
            element={
              <ProtectedRoute>
                <OptionsLanding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/options/:ticker"
            element={
              <ProtectedRoute>
                <OptionsChainPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Landing />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
