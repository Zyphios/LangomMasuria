import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Gallery from './Gallery';
import * as galleryApi from '../api/gallery';
import * as pricingApi from '../api/pricing';
import { vi } from 'vitest';

vi.spyOn(galleryApi, 'getGalleryImages').mockResolvedValue([
  { id: '1', url: 'https://example.com/1.jpg', captionPl: 'Widok', captionEn: 'View', sortOrder: 1 }
]);

vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue([
  { id: 's1', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '1200', dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true }
]);

describe('gallery page', () => {
  it('renders masonry images and featured pricing cards', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Gallery />
      </QueryClientProvider>
    );
    expect(await screen.findByText('Widok')).toBeInTheDocument();
    expect(await screen.findByText('1200 PLN / noc')).toBeInTheDocument();
  });
});
