import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`,
  withCredentials: true,
});

// Attach token from localStorage if present
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    try {
      const auth = JSON.parse(localStorage.getItem('quantumxd-auth') || '{}');
      if (auth?.state?.token) {
        config.headers.Authorization = `Bearer ${auth.state.token}`;
      }
    } catch { /* ignore */ }
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('quantumxd-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
