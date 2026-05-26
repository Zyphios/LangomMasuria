import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Gallery from './Gallery';
import * as galleryApi from '../api/gallery';
import * as pricingApi from '../api/pricing';
import { vi } from 'vitest';

vi.spyOn(galleryApi, 'getGalleryImages').mockResolvedValue([
  { id: '1', url: 'https://example.com/1.jpg', captionPl: 'Widok', captionEn: 'View', sortOrder: 1 }
]);

vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue([
  { id: 's1', namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: '900', dateFrom: '2026-01-01', dateTo: '2026-04-30', isFeatured: false },
  { id: 's2', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '1200', dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true },
  { id: 's3', namePl: 'Święta i Sylwester', nameEn: 'Holidays and New Year', pricePerNight: '1500', dateFrom: '2026-12-20', dateTo: '2027-01-06', isFeatured: false }
]);

describe('gallery page', () => {
  it('renders the redesigned gallery pricing section and booking call to action', async () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <Gallery />
        </QueryClientProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Galeria')).toBeInTheDocument();
    expect(await screen.findByText('Cennik')).toBeInTheDocument();
    expect(await screen.findByText('POPULARNY')).toBeInTheDocument();
    expect(await screen.findByText('1200')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ZAREZERWUJ SWÓJ POBYT' })).toBeInTheDocument();
  });
});
