import { useState } from 'react'
import { signup, login } from '../api'

const AuthForm = ({ onAuth }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') await login(username, password)
      else await signup(username, password)
      onAuth()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 p-6 border border-gray-200 rounded-lg">
      <h1 className="text-lg font-semibold mb-4">Sneaker Drop</h1>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <button type="submit" className="bg-black text-white rounded px-3 py-2 text-sm">
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="text-sm text-gray-500 underline mt-3"
      >
        Switch to {mode === 'login' ? 'sign up' : 'log in'}
      </button>
      {error && <p className="text-sm text-red-600 mt-3">Error: {error}</p>}
    </div>
  )
}

export default AuthForm
