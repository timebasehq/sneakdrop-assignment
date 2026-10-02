const QueuePanel = ({ position, onLeave }) => {
  return (
    <div className="border border-gray-200 rounded p-3 mt-3 text-sm flex items-center justify-between">
      <span>
        You are <span className="font-semibold">#{position}</span> in the waiting line.
      </span>
      <button onClick={onLeave} className="text-gray-500 underline text-xs">
        Leave queue
      </button>
    </div>
  )
}

export default QueuePanel
