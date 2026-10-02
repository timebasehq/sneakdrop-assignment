import { useEffect, useState } from 'react'

const Countdown = ({ expiresAt, onExpire }) => {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const tick = () => {
      const timeLeftInSeconds = (new Date(expiresAt).getTime() - new Date())/1000
      const time = Math.max(0, Math.floor(timeLeftInSeconds))
      setRemaining(time)
      if (time === 0) onExpire?.()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')
  return <span className="font-semibold">{mm}:{ss}</span>
}

export default Countdown
