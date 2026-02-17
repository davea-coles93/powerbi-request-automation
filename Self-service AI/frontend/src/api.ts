import axios from 'axios';
import type { ChangeRequest, CreateRequestDTO, Stats } from './types';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const requestsApi = {
  create: async (data: CreateRequestDTO): Promise<ChangeRequest> => {
    const response = await api.post<ChangeRequest>('/requests', data);
    return response.data;
  },

  getAll: async (): Promise<ChangeRequest[]> => {
    const response = await api.get<ChangeRequest[]>('/requests');
    return response.data;
  },

  getById: async (id: string): Promise<ChangeRequest> => {
    const response = await api.get<ChangeRequest>(`/requests/${id}`);
    return response.data;
  },

  execute: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/requests/${id}/execute`);
    return response.data;
  },

  submitClarification: async (id: string, answers: string): Promise<ChangeRequest> => {
    const response = await api.post<ChangeRequest>(`/requests/${id}/clarify`, { response: answers });
    return response.data;
  },

  getStats: async (): Promise<Stats> => {
    const response = await api.get<Stats>('/requests/stats/summary');
    return response.data;
  },
};

export const healthApi = {
  check: async (): Promise<{ status: string; services: Record<string, string> }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export const modelApi = {
  getInfo: async () => {
    const response = await api.get('/model');
    return response.data;
  },
};
