import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminBookings from './AdminBookings';
import * as adminApi from '../../api/admin';
import { vi } from 'vitest';

localStorage.setItem('adminToken', 'jwt-token');

vi.spyOn(adminApi, 'getAdminBookings').mockResolvedValue([
  { id: 'b1', guestName: 'Anna', status: 'PENDING', checkIn: '2026-06-01', checkOut: '2026-06-04', totalPrice: '3800' }
]);

describe('admin tabs', () => {
  it('renders bookings returned by the admin API', async () => {
    render(
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>
    );
    expect(await screen.findByText('Anna')).toBeInTheDocument();
  });
});
