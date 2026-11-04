import { apiClient } from './client';
import type { PricingSeason, PricingSettings } from '../types';

export const getPricingSeasons = () => apiClient<PricingSeason[]>('/api/pricing');
export const getPricingSettings = () => apiClient<PricingSettings>('/api/pricing/settings');
