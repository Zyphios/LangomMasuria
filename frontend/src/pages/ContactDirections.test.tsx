import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, MemoryRouter } from 'react-router-dom';
import App from '../App';
import i18n from '../i18n';

let settings = { facebookUrl: '', instagramUrl: '' };
let messages: unknown[];
let contactFailure: boolean;
let settingsFailure: boolean;
let holdContact: Promise<void> | undefined;

function show(entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}>
    <App /><Link to="/contact">Podgląd kontaktu</Link>
  </MemoryRouter></QueryClientProvider>);
}

beforeEach(async () => {
  await i18n.changeLanguage('pl');
  settings = { facebookUrl: '', instagramUrl: '' };
  messages = [];
  contactFailure = false;
  settingsFailure = false;
  holdContact = undefined;
  localStorage.setItem('adminToken', 'synthetic-admin-token');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const path = new URL(input).pathname;
    let data: unknown;
    const status = 200;
    if (path === '/api/site-settings' || path === '/api/admin/site-settings') {
      if (settingsFailure) return new Response('{"message":"Unavailable"}', { status: 503 });
      if (init?.method === 'PATCH') settings = JSON.parse(String(init.body));
      data = settings;
    } else if (path === '/api/contact') {
      if (contactFailure) return new Response('{"message":"Unavailable"}', { status: 500 });
      if (holdContact) await holdContact;
      messages.push(JSON.parse(String(init?.body)));
      data = { success: true };
    } else if (path === '/api/pricing/settings') {
      data = { minStayTextPl: 'Min. długość pobytu: 2 noce', minStayTextEn: 'Minimum stay: 2 nights' };
    } else if (path === '/api/availability') data = { blockedDates: [] };
    else if (path === '/api/pricing' || path === '/api/gallery') data = [];
    else throw new Error(`Unexpected API request: ${path}`);
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  }));
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  await i18n.changeLanguage('pl');
});

it.each([
  ['pl', 'Kontakt – Zarezerwuj swój pobyt na Mazurach', 'Jak dojechać?', 'Numer telefonu podamy wkrótce'],
  ['en', 'Contact – Book your stay in Masuria', 'Directions', 'Phone number coming soon']
])('separates contact from booking and directions in %s', async (locale, title, direction, phone) => {
  await i18n.changeLanguage(locale);
  show('/contact');
  expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  expect(screen.getByText(phone)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'domeknamazurskiej@gmail.com' })).toHaveAttribute('href', 'mailto:domeknamazurskiej@gmail.com');
  const nav = within(within(screen.getByRole('banner')).getByRole('navigation'));
  expect(nav.getByRole('link', { name: direction })).toHaveAttribute('href', '/directions');
  expect(nav.getByRole('link', { current: 'page' })).toHaveAttribute('href', '/contact');
  expect(screen.queryByRole('heading', { name: /Zasady Domu|House Rules/ })).not.toBeInTheDocument();
});

it('provides local driving instructions, transport distances and a working map destination', () => {
  show('/directions');
  expect(screen.getByRole('heading', { level: 1, name: 'Jak dojechać do Domku na Mazurskiej 31G w Starych Juchach?' })).toBeInTheDocument();
  expect(screen.getByText(/Ośrodku Terapii/)).toBeInTheDocument();
  expect(screen.getByText(/mijasz numer 31.*skręcasz w lewo/)).toBeInTheDocument();
  expect(screen.getByText(/2,2 km.*30 minut/)).toBeInTheDocument();
  expect(screen.getByText(/1,6 km.*500-lecia/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Otwórz trasę w Google Maps' })).toHaveAttribute('href', expect.stringContaining('53.91005862515826'));
  expect(screen.getByTitle('Mapa dojazdu do Domku na Mazurskiej')).toHaveAttribute('loading', 'lazy');
});

it('sends optional phone and dates to the existing owner message workflow without holding nights', async () => {
  const user = userEvent.setup();
  show('/contact');
  await user.type(screen.getByLabelText('Imię'), 'Maria');
  await user.type(screen.getByLabelText('E-mail'), 'maria@example.invalid');
  await user.type(screen.getByLabelText('Telefon (opcjonalnie)'), '+48 600 000 000');
  fireEvent.change(screen.getByLabelText('Przyjazd (opcjonalnie)'), { target: { value: '2030-07-10' } });
  fireEvent.change(screen.getByLabelText('Wyjazd (opcjonalnie)'), { target: { value: '2030-07-14' } });
  await user.type(screen.getByLabelText('Wiadomość'), 'Czy akceptujecie psy?');
  await user.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }));
  expect(await screen.findByRole('status', { name: 'Wynik wysłania wiadomości' })).toHaveTextContent('Wiadomość została wysłana.');
  expect(messages).toEqual([{ name: 'Maria', email: 'maria@example.invalid',
    message: 'Telefon: +48 600 000 000\nTermin pobytu: 2030-07-10 – 2030-07-14\n\nCzy akceptujecie psy?' }]);
});

it('sends a basic enquiry without adding empty phone or date headings', async () => {
  const user = userEvent.setup();
  show('/contact');
  await user.type(screen.getByLabelText('Imię'), 'Jan');
  await user.type(screen.getByLabelText('E-mail'), 'jan@example.invalid');
  await user.type(screen.getByLabelText('Wiadomość'), 'Pytanie o domek');
  await user.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }));
  expect(await screen.findByRole('status', { name: 'Wynik wysłania wiadomości' })).toBeInTheDocument();
  expect(messages).toEqual([{ name: 'Jan', email: 'jan@example.invalid', message: 'Pytanie o domek' }]);
});

it.each([['2030-07-14', '2030-07-10'], ['2030-07-14', ''], ['', '2030-07-14'], ['2030-07-14', '2030-07-14']])(
  'rejects incomplete or reversed enquiry dates %s / %s', async (arrival, departure) => {
    const user = userEvent.setup();
    show('/contact');
    await user.type(screen.getByLabelText('Imię'), 'Maria');
    await user.type(screen.getByLabelText('E-mail'), 'maria@example.invalid');
    await user.type(screen.getByLabelText('Wiadomość'), 'Pytanie');
    fireEvent.change(screen.getByLabelText('Przyjazd (opcjonalnie)'), { target: { value: arrival } });
    fireEvent.change(screen.getByLabelText('Wyjazd (opcjonalnie)'), { target: { value: departure } });
    await user.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Podaj obie daty; wyjazd musi być po przyjeździe.');
    expect(messages).toEqual([]);
  }
);

it('shows a contact delivery error and retains the enquiry for retry', async () => {
  contactFailure = true;
  const user = userEvent.setup();
  show('/contact');
  await user.type(screen.getByLabelText('Imię'), 'Maria');
  await user.type(screen.getByLabelText('E-mail'), 'maria@example.invalid');
  await user.type(screen.getByLabelText('Wiadomość'), 'Nie zgub pytania');
  await user.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się wysłać wiadomości');
  expect(screen.getByLabelText('Wiadomość')).toHaveValue('Nie zgub pytania');
  expect(screen.queryByRole('status', { name: 'Wynik wysłania wiadomości' })).not.toBeInTheDocument();
});

it('uses clearly marked home-page placeholders for unset social links in both header and contact', async () => {
  show('/contact');
  for (const region of ['banner', 'main']) {
    const area = within(screen.getByRole(region));
    expect(await area.findByRole('link', { name: 'Facebook — wkrótce' })).toHaveAttribute('href', '/');
    expect(area.getByRole('link', { name: 'Instagram — wkrótce' })).toHaveAttribute('href', '/');
  }
});

it('saves social links in the admin editor and uses them immediately on the public page', async () => {
  const user = userEvent.setup();
  show('/admin/settings');
  await user.type(await screen.findByLabelText('Facebook — link'), 'https://www.facebook.com/example');
  await user.type(screen.getByLabelText('Instagram — link'), 'https://www.instagram.com/example/');
  await user.click(screen.getByRole('button', { name: 'Zapisz linki' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Zapisano');
  await user.click(screen.getByRole('link', { name: 'Podgląd kontaktu' }));
  for (const region of ['banner', 'main']) {
    const facebook = await within(screen.getByRole(region)).findByRole('link', { name: 'Facebook' });
    expect(facebook).toHaveAttribute('href', 'https://www.facebook.com/example');
    expect(facebook).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(screen.getByRole(region)).getByRole('link', { name: 'Instagram' }))
      .toHaveAttribute('href', 'https://www.instagram.com/example/');
  }
});

it.each(['http://facebook.com/example', 'https:facebook.com/example', 'javascript:alert(1)', 'not-a-link'])('rejects invalid social link %s in the editor without saving it', async (value) => {
  const user = userEvent.setup();
  show('/admin/settings');
  await user.type(await screen.findByLabelText('Facebook — link'), value);
  await user.click(screen.getByRole('button', { name: 'Zapisz linki' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Podaj pełny link HTTPS lub zostaw puste pole.');
  expect(settings).toEqual({ facebookUrl: '', instagramUrl: '' });
});

it('clears saved social links back to the marked home-page placeholders', async () => {
  settings = { facebookUrl: 'https://facebook.com/example', instagramUrl: 'https://instagram.com/example' };
  const user = userEvent.setup();
  show('/admin/settings');
  await user.clear(await screen.findByLabelText('Facebook — link'));
  await user.clear(screen.getByLabelText('Instagram — link'));
  await user.click(screen.getByRole('button', { name: 'Zapisz linki' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Zapisano');
  await user.click(screen.getByRole('link', { name: 'Podgląd kontaktu' }));
  expect(await within(screen.getByRole('main')).findByRole('link', { name: 'Facebook — wkrótce' })).toHaveAttribute('href', '/');
});

it('retains the social-link draft and reports a failed save without claiming success', async () => {
  const user = userEvent.setup();
  show('/admin/settings');
  await user.type(await screen.findByLabelText('Facebook — link'), 'https://facebook.com/example');
  settingsFailure = true;
  await user.click(screen.getByRole('button', { name: 'Zapisz linki' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się zapisać linków');
  expect(screen.getByLabelText('Facebook — link')).toHaveValue('https://facebook.com/example');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('prevents duplicate enquiries while the first request is pending', async () => {
  let release!: () => void;
  holdContact = new Promise((resolve) => { release = resolve; });
  const user = userEvent.setup();
  show('/contact');
  await user.type(screen.getByLabelText('Imię'), 'Maria');
  await user.type(screen.getByLabelText('E-mail'), 'maria@example.invalid');
  await user.type(screen.getByLabelText('Wiadomość'), 'Jedno pytanie');
  await user.dblClick(screen.getByRole('button', { name: 'Wyślij wiadomość' }));
  expect(screen.getByRole('button', { name: 'Wysyłanie…' })).toBeDisabled();
  await act(async () => { release(); });
  expect(await screen.findByRole('status', { name: 'Wynik wysłania wiadomości' })).toBeInTheDocument();
  expect(messages).toHaveLength(1);
});

it('does not present a failed settings load as successfully configured placeholders', async () => {
  settingsFailure = true;
  show('/contact');
  expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('Nie udało się wczytać linków');
  expect(screen.queryByRole('link', { name: 'Facebook — wkrótce' })).not.toBeInTheDocument();
});

it('keeps house rules with pricing, rather than the contact form or booking wizard', () => {
  show('/pricing');
  const rules = within(screen.getByRole('region', { name: 'Zasady Domu' }));
  expect(rules.getByText('22:00 – 06:00')).toBeInTheDocument();
  expect(rules.getByText('Mile widziane')).toBeInTheDocument();
  expect(rules.getByText('W całym obiekcie')).toBeInTheDocument();
});
