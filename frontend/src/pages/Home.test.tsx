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
    expect(screen.getByText('Jacuzzi pod gwiazdami')).toBeInTheDocument();
    expect(screen.getByText('Las za progiem')).toBeInTheDocument();
    expect(screen.getByText('Wnętrze pełne światła')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ZOBACZ GALERIĘ' })).toBeInTheDocument();
  });
});
