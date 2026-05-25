import { apiClient } from './client';
import type { GalleryImage } from '../types';

export const getGalleryImages = () => apiClient<GalleryImage[]>('/api/gallery');
