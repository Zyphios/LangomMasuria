import { cleanup, render, screen, within } from '@testing-library/react';
import Attractions from './Attractions';
import i18n from '../i18n';

describe('attractions page', () => {
  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage('pl');
  });

  it('presents the panorama before the ten nearby attractions', async () => {
    await i18n.changeLanguage('pl');
    render(<Attractions />);
    expect(screen.getByRole('heading', {
      level: 1, name: 'Atrakcje w okolicy – co warto zobaczyć wokół Domku na Mazurskiej?'
    })).toBeInTheDocument();
    expect(screen.getByText(/Nasz domek to świetna baza wypadowa/)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Panorama mazurskich pagórków',
      'Kameralna plaża leśna – 500 m od domku',
      'Góra Piaskowa nad jeziorem Jędzelewo',
      '3 jeziora, wędkarstwo i łódka wiosłowa',
      'Leśne ścieżki Natura 2000',
      'Wieża widokowa w Starych Juchach',
      'Trasy rowerowe Mazur Garbatych',
      'Wypad do Ełku (ok. 20 km)',
      'Stare Juchy i wygoda na co dzień',
      'Wypad do Giżycka – porty i żeglowanie (32 km)',
      'Lokalna kuchnia – domowe obiady i świeża ryba'
    ]);
  });

  it('keeps walking distances, local food details and water equipment conditions accurate', async () => {
    await i18n.changeLanguage('pl');
    render(<Attractions />);
    expect(screen.getByText(/10-minutowy spacer przez las/)).toBeInTheDocument();
    const village = within(screen.getByRole('article', { name: 'Stare Juchy i wygoda na co dzień' }));
    expect(village.getByText(/Centrum Starych Juch i sklep Dino/))
      .toHaveTextContent('1,3 km (około 18 minut pieszo)');
    expect(village.getByText(/Piknik Jaćwieski/)).toBeInTheDocument();
    expect(screen.getByText(/Jeziora Jędzelewo, Garbas i Rekąty/)).toHaveTextContent('po wcześniejszym ustaleniu');
    expect(screen.getByText(/Gościniec Na Wzgórzu/)).toHaveTextContent('800 m, 10 minut spacerem');
    expect(screen.getByText(/smażalnia ryb przy plaży w Liskach/)).toHaveTextContent('1,5 km');
    expect(screen.getByText(/30 minut jazdy/)).toHaveTextContent('Twierdza Boyen');
  });

  it('uses the supplied town and landmark photos without presenting the cottage kitchen as a restaurant', async () => {
    await i18n.changeLanguage('pl');
    render(<Attractions />);
    for (const [heading, source] of [
      ['Góra Piaskowa nad jeziorem Jędzelewo', '/gora piachu.jpg'],
      ['Wieża widokowa w Starych Juchach', '/wieza stare juchy.jpg'],
      ['Wypad do Ełku (ok. 20 km)', '/elk.jpg'],
      ['Wypad do Giżycka – porty i żeglowanie (32 km)', '/gizycko.jpg']
    ]) {
      const card = within(screen.getByRole('article', { name: heading }));
      expect(card.getByRole('img')).toHaveAttribute('src', source);
    }
    const food = within(screen.getByRole('article', { name: 'Lokalna kuchnia – domowe obiady i świeża ryba' }));
    expect(food.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Panorama mazurskich pagórków' }))
      .toHaveAttribute('src', '/pagorki.jpg');
  });

  it('translates attraction headings and image descriptions into English', async () => {
    await i18n.changeLanguage('en');
    render(<Attractions />);
    expect(screen.getByRole('heading', {
      level: 1, name: 'Nearby attractions – what to see around Domek na Mazurskiej'
    })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(11);
    expect(screen.getByRole('img', { name: 'Viewing tower in Stare Juchy' }))
      .toHaveAttribute('src', '/wieza stare juchy.jpg');
    expect(screen.getByText(/The centre of Stare Juchy and the Dino supermarket/))
      .toHaveTextContent('1.3 km (approximately 18 minutes on foot)');
    expect(screen.getByText(/Lakes Jędzelewo, Garbas and Rekąty/)).toHaveTextContent('by prior arrangement');
    expect(screen.queryByText(/house\.attractions\./)).not.toBeInTheDocument();
  });
});
