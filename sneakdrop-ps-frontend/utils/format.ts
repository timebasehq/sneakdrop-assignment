export const formatCurrency = (amount: number, currency: "INR" | "USD" = "INR") => {
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getSafeImage = (url: unknown) => {
  if (!url || typeof url !== 'string') return '/balenciaga_speed_sneaker_1790697391065.png';
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return '/balenciaga_speed_sneaker_1790697391065.png'; // Fallback
};
