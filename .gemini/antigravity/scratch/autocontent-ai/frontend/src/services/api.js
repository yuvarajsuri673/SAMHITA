import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject Authorization header if token exists in localStorage
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('samhita_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    register: async (username, email, password) => {
      const response = await client.post('/auth/register', { username, email, password });
      return response.data;
    },
    login: async (email, password) => {
      const response = await client.post('/auth/login', { email, password });
      return response.data;
    },
    logout: async () => {
      const response = await client.post('/auth/logout');
      return response.data;
    },
    getMe: async () => {
      const response = await client.get('/auth/me');
      return response.data;
    },
  },
  // Get all generated posts
  getPosts: async () => {
    const response = await client.get('/posts');
    return response.data;
  },

  // Get specific post details
  getPost: async (id) => {
    const response = await client.get(`/posts/${id}`);
    return response.data;
  },

  // Update post status or edits
  updatePost: async (id, data) => {
    const response = await client.put(`/posts/${id}`, data);
    return response.data;
  },

  // Delete post
  deletePost: async (id) => {
    const response = await client.delete(`/posts/${id}`);
    return response.data;
  },

  // Delete all posts
  deleteAllPosts: async () => {
    const response = await client.delete('/posts');
    return response.data;
  },

  // Trigger Gemini AI editor rewrite
  rewritePost: async (id) => {
    const response = await client.post(`/posts/${id}/rewrite`);
    return response.data;
  },

  // Trigger Content Pipeline execution
  runPipeline: async (sector, limit) => {
    const response = await client.post('/agents/run', { sector, limit });
    return response.data;
  },
};
