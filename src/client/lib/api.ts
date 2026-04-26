import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  description: string;
  merchant?: string;
  category?: string;
  date: string;
  receiptUrl?: string;
  receiptText?: string;
  notes?: string;
  source: string;
  sourcePhone?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  _count?: {
    expenses: number;
  };
}

export interface Stats {
  total: number;
  count: number;
  average: number;
  byCategory: Array<{
    category: string;
    total: number;
    count: number;
    average: number;
  }>;
}

export const authApi = {
  register: async (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

export const expenseApi = {
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    limit?: number;
  }) => {
    const response = await api.get<Expense[]>('/expenses', { params });
    return response.data;
  },
  getOne: async (id: string) => {
    const response = await api.get<Expense>(`/expenses/${id}`);
    return response.data;
  },
  create: async (data: Partial<Expense>) => {
    const response = await api.post<Expense>('/expenses', data);
    return response.data;
  },
  update: async (id: string, data: Partial<Expense>) => {
    const response = await api.put<Expense>(`/expenses/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },
};

export const categoryApi = {
  getAll: async () => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },
  create: async (data: { name: string; color?: string; icon?: string }) => {
    const response = await api.post<Category>('/categories', data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },
};

export const statsApi = {
  get: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get<Stats>('/stats', { params });
    return response.data;
  },
};

export const reportsApi = {
  emailReport: async (period?: string) => {
    const response = await api.post('/reports/email', { period });
    return response.data;
  },
  downloadCsv: async (params?: { startDate?: string; endDate?: string; category?: string }) => {
    const response = await api.get('/reports/csv', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `billie-expenses-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default api;
