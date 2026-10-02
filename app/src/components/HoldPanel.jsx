import { useEffect, useState } from 'react'
import Countdown from './Countdown'

const HoldPanel = ({ hold, onPay }) => {
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    setExpired(false)
  }, [hold.id])

  return (
    <div className="border border-gray-200 rounded p-3 mt-3">
      <p className="text-sm mb-2">
        You are holding a pair. Time left:{' '}
        <Countdown expiresAt={hold.expires_at} onExpire={() => setExpired(true)} />
      </p>
      {expired ? (
        <p className="text-sm text-gray-500 text-center my-3">Hold expired — releasing your pair...</p>
      ) : (
        <div className='flex items-center justify-center my-3'>
          <button onClick={() => onPay(hold.id)} className="bg-black text-white rounded px-3 py-1.5 text-sm">
            Pay now
          </button>
        </div>
      )}
    </div>
  )
}

export default HoldPanel
