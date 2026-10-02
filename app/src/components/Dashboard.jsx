import { useEffect, useState } from 'react'
import { getStatus, buyNow as apiBuyNow, confirmPayment, leaveQueue, leaveQueueOnUnload, logout } from '../api'
import StockStatus from './StockStatus'
import HoldPanel from './HoldPanel'
import QueuePanel from './QueuePanel'

const Dashboard = ({ session, onLogout }) => {
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState('')

  async function refresh() {
    try {
      const data = await getStatus()
      setStatus(data)
    } catch {
      // token likely invalid/expired — send back to login
      await logout()
      onLogout()
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 2000)
    return () => clearInterval(id)
  }, [])

  // Best-effort: if the tab closes while queued, tell the server so the
  // next person isn't stuck waiting behind someone who already left.
  useEffect(() => {
    const isQueued = Boolean(status?.queue_position)
    if (!isQueued) return
    const handler = () => leaveQueueOnUnload()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [status?.queue_position])

  async function buyNow() {
    setMessage('')
    const data = await apiBuyNow()
    if (data.status === 'already_holding') setMessage('You already have a hold in progress.')
    else if (data.status === 'limit_reached') setMessage('You already bought the max of 2 pairs.')
    else if (data.status === 'queued') setMessage(`No stock left — you are #${data.position} in line.`)
    else if (data.status === 'holding') setMessage('Pair held for you. You have 5 minutes to pay.')
    refresh()
  }

  async function pay(holdId) {
    const paymentId = crypto.randomUUID()
    window.alert('Payment succeeded')
    const data = await confirmPayment(holdId, paymentId)
    if (data.status === 'paid') setMessage('Payment confirmed. Pair is yours!')
    else if (data.status === 'hold_expired') setMessage('Payment arrived too late — your hold had already expired.')
    refresh()
  }

  async function leaveTheQueue() {
    const data = await leaveQueue()
    if (data.status === 'left') setMessage('You left the waiting line.')
    refresh()
  }

  async function signOut() {
    await logout()
    onLogout()
  }

  if (!status) return <p className="text-center mt-16 text-sm text-gray-500">Loading...</p>

  return (
    <div className="max-w-sm mx-auto mt-16 p-6 border border-gray-200 rounded-lg">
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-lg font-semibold">Sneaker Drop</h1>
        <button onClick={signOut} className="text-sm text-gray-500 underline">
          Sign out
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4">Signed in as {session.username}</p>

      <StockStatus available={status.available} purchasedCount={status.purchased_count} />

      {status.hold && <HoldPanel hold={status.hold} onPay={pay} />}

      {status.queue_position && (
        <QueuePanel position={status.queue_position} onLeave={leaveTheQueue} />
      )}

      {!status.hold && !status.queue_position && status.sold_out && (
        <p className="text-sm text-gray-500">Out of stock.</p>
      )}

      {!status.hold && !status.queue_position && !status.sold_out && (
        <button
          onClick={buyNow}
          disabled={status.purchased_count >= 2}
          className="bg-black text-white rounded px-3 py-2 text-sm disabled:opacity-50"
        >
          Buy Now
        </button>
      )}

      {message && <p className="text-sm mt-3">{message}</p>}
    </div>
  )
}

export default Dashboard
