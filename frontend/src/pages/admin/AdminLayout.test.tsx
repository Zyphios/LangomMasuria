import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import * as adminApi from '../../api/admin';
import { vi } from 'vitest';

vi.spyOn(adminApi, 'loginAdmin').mockResolvedValue({ token: 'jwt-token' });

describe('admin login', () => {
  it('stores the JWT in localStorage after successful login', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    
    await user.type(screen.getByLabelText('Email'), 'admin@lagommasuria.pl');
    await user.type(screen.getByLabelText('Hasło'), 'Lagom123!');
    await user.click(screen.getByRole('button', { name: 'Zaloguj' }));
    
    expect(localStorage.getItem('adminToken')).toBe('jwt-token');
  });
});
