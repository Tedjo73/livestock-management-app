import axios from 'axios';

// Detect the API base URL:
// 1. Explicit env var (set in Vercel/Netlify for standalone frontend)
// 2. Production (Render unified deployment) → relative /api path
// 3. Local dev → proxy to localhost:5000
const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (process.env.NODE_ENV === 'production') return '/api';
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agriconnect_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401s globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('agriconnect_token');
      localStorage.removeItem('agriconnect_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
