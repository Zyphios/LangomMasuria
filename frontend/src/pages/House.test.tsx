import { render, screen } from '@testing-library/react';
import House from './House';

describe('house page', () => {
  it('shows the house stats and nearby attractions', () => {
    render(<House />);
    expect(screen.getByText('120 m²')).toBeInTheDocument();
    expect(screen.getByText('Lake Garbas 500 m')).toBeInTheDocument();
    expect(screen.getByText('Kajaki i wędkowanie')).toBeInTheDocument();
  });
});
