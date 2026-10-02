const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Request failed')
  return data
}

export async function signup(username, password) {
  const data = await request('/signup', { method: 'POST', body: JSON.stringify({ username, password }) })
  localStorage.setItem('token', data.token)
  localStorage.setItem('username', username)
}

export async function login(username, password) {
  const data = await request('/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  localStorage.setItem('token', data.token)
  localStorage.setItem('username', username)
}

export async function logout() {
  try {
    await request('/logout', { method: 'POST' })
  } catch {
    // best-effort — still clear the local session either way
  }
  localStorage.removeItem('token')
  localStorage.removeItem('username')
}

export function getSession() {
  const token = getToken()
  const username = localStorage.getItem('username')
  return token && username ? { username } : null
}

export function getStatus() {
  return request('/status')
}

export function buyNow() {
  return request('/buy', { method: 'POST' })
}

export function confirmPayment(holdId, paymentId) {
  return request('/confirm_payment', {
    method: 'POST',
    body: JSON.stringify({ hold_id: holdId, payment_id: paymentId }),
  })
}

export function leaveQueue() {
  return request('/leave_queue', { method: 'POST' })
}

// Best-effort call for when the tab is closing — fetch with keepalive
// survives page unload long enough to reach the server, unlike a normal fetch.
export function leaveQueueOnUnload() {
  const token = getToken()
  if (!token) return
  fetch(`${API_URL}/leave_queue`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    keepalive: true,
  })
}
