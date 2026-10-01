export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint; // Using relative URL since we have rewrites in next.config.ts

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  let data = null;
  try {
    const text = await response.text();
    if (text) {
      data = JSON.parse(text);
    }
  } catch {
    // Ignore invalid JSON responses
  }

  if (!response.ok) {
    const errorMsg = data?.error || response.statusText;
    const error = new Error(errorMsg) as any;
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
