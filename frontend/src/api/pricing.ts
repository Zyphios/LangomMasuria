import { apiClient } from './client';
import type { PricingSeason } from '../types';

export const getPricingSeasons = () => apiClient<PricingSeason[]>('/api/pricing');
