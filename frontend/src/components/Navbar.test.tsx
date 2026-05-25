import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

describe('navbar and language toggle', () => {
  it('persists selected language to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Layout>
          <div>page</div>
        </Layout>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(localStorage.getItem('lang')).toBe('en');
  });
});
