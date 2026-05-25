import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';

describe('home page', () => {
  it('renders hero copy and amenity cards', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText('Twój azyl na Mazurach')).toBeInTheDocument();
    expect(screen.getByText('Jacuzzi pod gwiazdami')).toBeInTheDocument();
    expect(screen.getByText('Las za progiem')).toBeInTheDocument();
  });
});
