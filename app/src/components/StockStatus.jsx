const StockStatus = ({ available, purchasedCount }) => {
  return (
    <div className="mb-3">
      <p className="text-sm">
        <span className="font-semibold">{available}</span> pairs left in stock
      </p>
      <p className="text-sm">
        You've bought <span className="font-semibold">{purchasedCount} / 2</span>
      </p>
    </div>
  )
}

export default StockStatus
