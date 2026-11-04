import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import i18n from '../i18n';
import { installDialogTestMethods } from '../test/dialog';

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

describe('home page', () => {
  let restoreDialog: () => void;

  beforeEach(async () => {
    restoreDialog = installDialogTestMethods();
    await i18n.changeLanguage('pl');
  });

  afterEach(async () => {
    cleanup();
    restoreDialog();
    await i18n.changeLanguage('pl');
  });

  it('introduces the rental and location in one H1 and keeps the booking action', () => {
    renderHome();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Domek do wynajęcia na Mazurach Stare Juchy k. Ełku'
    })).toBeInTheDocument();
    expect(screen.getByText('Domek do wynajęcia na Mazurach')).toBeInTheDocument();
    expect(screen.getByText('Stare Juchy k. Ełku')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent(/Domek na Mazurskiej|\|/);
    expect(screen.getByText(/Gorąca balia pod gwiazdami/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ZAREZERWUJ TERAZ' })).toHaveAttribute('href', '/booking');
  });

  it('presents the new introduction and interior without outdated fireplace or reserve claims', () => {
    renderHome();
    expect(screen.getByText(/Szukasz miejsca na prawdziwy reset/)).toBeInTheDocument();
    expect(screen.getByText(/Romantyczny wyjazd we dwójkę/)).not.toHaveTextContent('i psem');
    expect(screen.getByRole('heading', {
      level: 2, name: 'Jasne, klimatyczne wnętrze z przepięknym widokiem'
    })).toBeInTheDocument();
    expect(screen.getByText(/Urządziliśmy Domek na Mazurskiej tak/)).toBeInTheDocument();
    expect(screen.getByText(/antresola na górze/)).toBeInTheDocument();
    expect(screen.queryByText(/kominkiem|rezerwatem przyrody/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ZOBACZ GALERIĘ' })).toHaveAttribute('href', '/gallery');
  });

  it('renders all six distinct highlights with equipment subject to prior arrangement', () => {
    renderHome();
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Gorąca balia z hydromasażem',
      '500 m do leśnego jeziora & sprzęt wodny',
      'Tuż przy lesie Natura 2000, staw i widok na łąki',
      'Ognisko, taras & biesiadowanie',
      'Plac zabaw, bramka & raj dla psa',
      'Wygodna lokalizacja i parking'
    ]);
    expect(screen.getByText(/małą łódkę wiosłową \(po wcześniejszym ustaleniu\)/)).toBeInTheDocument();
    expect(screen.getByText(/Twój pies też jest u nas bardzo mile widziany/)).toBeInTheDocument();
  });

  it('uses the agreed distance and walking time for both the village centre and Dino', () => {
    renderHome();
    const location = screen.getByText(/Centrum Starych Juch i sklep Dino/);
    expect(location).toHaveTextContent('1,3 km');
    expect(location).toHaveTextContent('18 minut');
    expect(location).not.toHaveTextContent(/1,5 km|19 minut|20 minut/);
  });

  it('uses the new banner and matches all six feature photos to their cards', () => {
    renderHome();
    expect(screen.getAllByRole('img')).toHaveLength(8);
    for (const [name, source] of [
      ['Domek na Mazurskiej - dom na Mazurach', '/Baner2.png'],
      ['Gorąca balia z hydromasażem', '/dodaj4.jpg'],
      ['500 m do leśnego jeziora & sprzęt wodny', '/garbas.jpg'],
      ['Tuż przy lesie Natura 2000, staw i widok na łąki', '/otoczenie.jpg'],
      ['Ognisko, taras & biesiadowanie', '/ognisko.jpg'],
      ['Plac zabaw, bramka & raj dla psa', '/bramka.jpg'],
      ['Wygodna lokalizacja i parking', '/parking.jpg'],
      ['Domek na Mazurskiej - wnętrze salonu', '/IMG_20260705_163047.jpg']
    ]) {
      expect(screen.getByRole('img', { name })).toHaveAttribute('src', source);
    }
  });

  it('opens the complete firepit photo on click and returns focus after closing', async () => {
    const user = userEvent.setup();
    renderHome();
    const open = screen.getByRole('button', { name: 'Powiększ zdjęcie: Ognisko, taras & biesiadowanie' });
    await user.click(open);
    const preview = within(screen.getByRole('dialog', { name: 'Podgląd zdjęć' }));
    expect(preview.getByRole('img', { name: 'Ognisko, taras & biesiadowanie' }))
      .toHaveAttribute('src', '/ognisko.jpg');
    await user.click(preview.getByRole('button', { name: 'Zamknij podgląd' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(open).toHaveFocus();
  });

  it('opens the firepit preview with the keyboard and an English caption', async () => {
    await i18n.changeLanguage('en');
    const user = userEvent.setup();
    renderHome();
    const open = screen.getByRole('button', { name: 'Enlarge photo: Campfire, terrace & outdoor dining' });
    open.focus();
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', { name: 'Photo viewer' });
    const preview = within(dialog);
    expect(preview.getByRole('img', { name: 'Campfire, terrace & outdoor dining' }))
      .toHaveAttribute('src', '/ognisko.jpg');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(open).toHaveFocus();
  });

  it('provides the same six highlights, new copy, and working actions in English', async () => {
    await i18n.changeLanguage('en');
    renderHome();
    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Holiday cottage in Masuria Stare Juchy near Ełk'
    })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Private hot tub with hydromassage',
      '500 m to a forest lake & water sports',
      'Natura 2000 forest, pond and meadow views',
      'Campfire, terrace & outdoor dining',
      'Playground, football goal & a dog-friendly stay',
      'Convenient location and parking'
    ]);
    expect(screen.getByText(/The centre of Stare Juchy and the Dino supermarket/))
      .toHaveTextContent('18-minute walk');
    expect(screen.getByText(/A romantic getaway for two/)).not.toHaveTextContent('your dog');
    expect(screen.getByRole('heading', {
      level: 2, name: 'Bright, welcoming interiors with beautiful views'
    })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Check availability' })).toHaveAttribute('href', '/booking');
    expect(screen.getByRole('link', { name: 'SEE THE GALLERY' })).toHaveAttribute('href', '/gallery');
    expect(screen.queryByText(/home\.(hero|intro|amenities|interior)\./)).not.toBeInTheDocument();
  });
});
