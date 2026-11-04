import { apiClient } from './client';
import type { SiteSettings } from '../types';

export const getSiteSettings = () => apiClient<SiteSettings>('/api/site-settings');
