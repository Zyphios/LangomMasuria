import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';
import Navbar from './Navbar';
import i18n from '../i18n';

beforeEach(async () => {
  await i18n.changeLanguage('pl');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('navbar and language toggle', () => {
  it.each(['banner', 'contentinfo'])('provides a branded home link in the %s', (region) => {
    render(
      <MemoryRouter>
        <Layout>
          <div>page</div>
        </Layout>
      </MemoryRouter>
    );

    const homeLink = within(screen.getByRole(region)).getByRole('link', { name: 'Domek na Mazurskiej' });
    expect(homeLink).toHaveAttribute('href', '/');
    expect(within(homeLink).getByRole('img', { name: 'Domek na Mazurskiej' })).toHaveAttribute(
      'src',
      '/logo-mazurska.jpg'
    );
  });

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

describe('mobile navigation', () => {
  function renderNavbar(entry = '/house') {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Navbar />
      </MemoryRouter>
    );
  }

  it('opens and closes the navigation from an accessible menu button', async () => {
    const user = userEvent.setup();
    renderNavbar();

    const toggle = screen.getByRole('button', { name: /menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toContainElement(
      screen.getByRole('navigation')
    );

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const navigation = within(screen.getByRole('navigation'));
    for (const [name, href] of [
      ['Dom', '/house'],
      ['Atrakcje', '/attractions'],
      ['Galeria', '/gallery'],
      ['Cennik', '/pricing'],
      ['Kontakt', '/booking']
    ]) {
      expect(navigation.getByRole('link', { name })).toHaveAttribute('href', href);
    }

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape and returns keyboard focus to the menu button', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const toggle = screen.getByRole('button', { name: /menu/i });
    await user.click(toggle);
    screen.getByRole('link', { name: 'Dom' }).focus();

    await user.keyboard('{Escape}');

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('lets keyboard users enter the navigation with Tab after opening the menu', async () => {
    const user = userEvent.setup();
    renderNavbar();
    screen.getByRole('button', { name: /menu/i }).focus();
    await user.keyboard('{Enter}');

    await user.tab();

    expect(screen.getByRole('link', { name: 'Dom' })).toHaveFocus();
  });

  it.each(['Dom', 'Atrakcje', 'Kontakt', 'Rezerwuj', 'Domek na Mazurskiej'])(
    'closes after selecting %s, including the current page',
    async (name) => {
      const user = userEvent.setup();
      renderNavbar();
      const toggle = screen.getByRole('button', { name: /menu/i });
      await user.click(toggle);

      await user.click(screen.getByRole('link', { name }));

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
  );

  it('keeps the language selector available in the expanded menu', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const toggle = screen.getByRole('button', { name: /menu/i });
    await user.click(toggle);

    await user.click(screen.getByRole('button', { name: 'EN' }));

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'House' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Book now' })).toHaveAttribute('href', '/booking');
    expect(localStorage.getItem('lang')).toBe('en');
    expect(toggle).toHaveAccessibleName('Close menu');
  });
});
