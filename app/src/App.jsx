import { useState } from 'react'
import { getSession } from './api'
import AuthForm from './components/AuthForm'
import Dashboard from './components/Dashboard'

const App = () => {
  const [session, setSession] = useState(getSession())

  if (!session) return <AuthForm onAuth={() => setSession(getSession())} />
  return <Dashboard session={session} onLogout={() => setSession(null)} />
}

export default App
