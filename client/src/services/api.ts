import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('farollagro-auth');
    if (token) {
      try {
        const auth = JSON.parse(token);
        if (auth.state?.token) {
          config.headers.common['Authorization'] = `Bearer ${auth.state.token}`;
        }
      } catch (e) {
        // Ignore
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('farollagro-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
