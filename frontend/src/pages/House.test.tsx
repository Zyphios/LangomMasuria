import { render, screen } from '@testing-library/react';
import House from './House';

describe('house page', () => {
  it('shows the redesigned house intro and nearby attractions', () => {
    render(<House />);
    expect(screen.getByText('O Naszym Domu')).toBeInTheDocument();
    expect(screen.getByText('50 m²')).toBeInTheDocument();
    expect(screen.getByText('Jezioro Garbas')).toBeInTheDocument();
    expect(screen.getByText('Kajaki i SUP')).toBeInTheDocument();
    expect(screen.getByText('Lokalna kuchnia')).toBeInTheDocument();
  });
});
