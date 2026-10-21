// The CMS: /login and /admin/*. Loaded on demand, so visitors never download it.
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api } from './api'
import { ContentStore } from './store'
import Layout from './Layout'
import Login from './Login'
import Overview from './pages/Overview'
import ProjectsList from './pages/ProjectsList'
import ProjectEdit from './pages/ProjectEdit'
import AboutSkills from './pages/AboutSkills'
import Contact from './pages/Contact'
import General from './pages/General'

function Protected() {
  const navigate = useNavigate()
  const [user, setUser] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Portfolio CMS'
    api.me().then(
      (me) => setUser(me.username),
      () => navigate('/login', { replace: true }),
    )
  }, [navigate])

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F6F3EE]">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-terra border-t-transparent" aria-label="Loading" />
      </div>
    )
  }

  return (
    <ContentStore>
      <Routes>
        <Route element={<Layout username={user} />}>
          <Route index element={<Overview />} />
          <Route path="projects" element={<ProjectsList />} />
          <Route path="projects/:index" element={<ProjectEdit />} />
          <Route path="about" element={<AboutSkills />} />
          <Route path="contact" element={<Contact />} />
          <Route path="general" element={<General />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </ContentStore>
  )
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin/*" element={<Protected />} />
    </Routes>
  )
}
