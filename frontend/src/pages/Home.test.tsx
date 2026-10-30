import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';

describe('home page', () => {
  it('renders hero, amenity cards, and the interior gallery call to action', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText('Twój azyl na Mazurach')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Domek na Mazurskiej - dom na Mazurach' }))
      .toHaveAttribute('src', '/glowne-foto kadr.jpg');
    expect(screen.getByRole('heading', { name: 'Jacuzzi i Bania' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Otoczenie Lasu' })).toBeInTheDocument();
    expect(screen.getByText('Wnętrze pełne światła')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ZOBACZ GALERIĘ' })).toBeInTheDocument();
  });
});
