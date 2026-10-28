import { cleanup, render, screen } from '@testing-library/react';
import Attractions from './Attractions';
import i18n from '../i18n';

describe('attractions page', () => {
  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage('pl');
  });

  it('shows the nearby attractions moved from the house page', async () => {
    await i18n.changeLanguage('pl');
    render(<Attractions />);
    expect(screen.getByRole('heading', { level: 1, name: 'Atrakcje w okolicy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jezioro Garbas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kajaki i SUP' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lokalna kuchnia' })).toBeInTheDocument();
  });

  it('translates attraction headings and image descriptions into English', async () => {
    await i18n.changeLanguage('en');
    render(<Attractions />);
    expect(screen.getByRole('heading', { level: 1, name: 'Attractions nearby' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Garbas Lake' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Kitchen at Domek na Mazurskiej' })).toBeInTheDocument();
  });
});
