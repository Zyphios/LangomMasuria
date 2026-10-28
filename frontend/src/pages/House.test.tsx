import { render, screen } from '@testing-library/react';
import House from './House';

describe('house page', () => {
  it('shows the house intro and its floor area', () => {
    render(<House />);
    expect(screen.getByText('O Naszym Domu')).toBeInTheDocument();
    expect(screen.getByText('50 m²')).toBeInTheDocument();
  });
});
