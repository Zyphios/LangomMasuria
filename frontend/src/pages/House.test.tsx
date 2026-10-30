import { cleanup, render, screen } from '@testing-library/react';
import House from './House';
import i18n from '../i18n';

describe('house page', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pl');
  });

  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage('pl');
  });

  it('shows the house intro and its floor area', () => {
    render(<House />);
    expect(screen.getByText('O Naszym Domu')).toBeInTheDocument();
    expect(screen.getByText('50 m²')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Domek na Mazurskiej' }))
      .toHaveAttribute('src', '/glowne-foto kadr.jpg');
  });

  it('presents the amenities with wood and equipment availability terms', () => {
    render(<House />);
    expect(screen.getByRole('heading', { name: 'Na świeżym powietrzu' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aktywnie i rodzinnie' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Komfort wewnątrz' })).toBeInTheDocument();
    for (const amenity of [
      'Grill', 'Miejsce na ognisko', 'Jacuzzi i bania', 'Bramka do gry w piłkę',
      'Podwórko do zabawy', 'Rowery i SUP', 'Ekspres przelewowy', 'Klimatyzacja',
      'Telewizor', 'Internet'
    ]) {
      expect(screen.getByText(amenity)).toBeInTheDocument();
    }
    expect(screen.getByText('Pierwszy worek drewna w cenie pobytu. Kolejne worki dodatkowo płatne — cenę ustalimy przed przyjazdem.')).toBeInTheDocument();
    expect(screen.getByText('Rowery i SUP dostępne po wcześniejszym uzgodnieniu.')).toBeInTheDocument();
  });

  it('provides English amenity descriptions and the same availability conditions', async () => {
    await i18n.changeLanguage('en');
    render(<House />);
    expect(screen.getByRole('heading', { name: 'In the open air' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Active days for the family' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Comfort indoors' })).toBeInTheDocument();
    expect(screen.getByText('Drip coffee maker')).toBeInTheDocument();
    expect(screen.getByText('Air conditioning')).toBeInTheDocument();
    expect(screen.getByText('The first bag of firewood is included in your stay. Additional bags cost extra — we will agree the price before arrival.')).toBeInTheDocument();
    expect(screen.getByText('Bicycles and SUP are available by prior arrangement.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'The Masurian landscape around the house' })).toHaveAttribute('src', '/pagorki.jpg');
  });
});
