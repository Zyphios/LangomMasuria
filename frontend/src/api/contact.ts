import { apiClient } from './client';
import type { ContactPayload } from '../types';

export const sendContactMessage = (payload: ContactPayload) =>
  apiClient<{ success: true }>('/api/contact', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
