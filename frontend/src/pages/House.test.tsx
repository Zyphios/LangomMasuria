import { cleanup, render, screen, within } from '@testing-library/react';
import House from './House';
import i18n from '../i18n';

describe('house page', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pl');
  });

  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage('pl');
  });

  it('introduces the house with an accurate bedroom, mezzanine and guest summary', () => {
    render(<House />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', {
      level: 1, name: 'O Domku na Mazurskiej – Poznaj nasze wnętrza i otoczenie'
    })).toBeInTheDocument();
    expect(screen.getByText(/Nasz całoroczny domek w Starych Juchach/)).toBeInTheDocument();
    expect(screen.getByText('42 m²')).toBeInTheDocument();
    expect(screen.getByText('1 + 1')).toBeInTheDocument();
    expect(screen.getByText('Sypialnia + antresola')).toBeInTheDocument();
    expect(screen.getByText('2–6')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Domek na Mazurskiej' }))
      .toHaveAttribute('src', '/glowne-foto kadr.jpg');
  });

  it('presents the indoor, outdoor and family zones before the full inventory', () => {
    render(<House />);
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Komfort wewnątrz', 'Na świeżym powietrzu', 'Aktywnie i rodzinnie', 'Pełna lista wyposażenia'
    ]);
  });

  it('describes all three sleeping spaces and the detailed indoor facilities', () => {
    render(<House />);
    const indoor = within(screen.getByRole('region', { name: 'Komfort wewnątrz' }));
    expect(indoor.getByRole('heading', { name: 'Wygodne miejsca do spania (2–6 osób)' })).toBeInTheDocument();
    for (const title of ['Sypialnia na dole', 'Klimatyczna antresola', 'Salon na dole']) {
      expect(indoor.getByText(title)).toBeInTheDocument();
    }
    expect(indoor.getByText(/rozkładaną kanapą/)).toBeInTheDocument();
    expect(indoor.getByText(/podwójnym łóżkiem małżeńskim oraz ogrzewaniem podłogowym/)).toBeInTheDocument();
    expect(indoor.getByText(/Zmywarka, przelewowy ekspres do kawy/)).toBeInTheDocument();
    expect(indoor.getByText(/suszarka do włosów/)).toBeInTheDocument();
    expect(indoor.getByText(/ogrzewanie podłogowe w sypialni i łazience/)).toBeInTheDocument();
    expect(indoor.getByText(/Bezpłatne Wi-Fi oraz TV/)).toBeInTheDocument();
  });

  it('does not show firewood terms and makes equipment and baby facilities conditional', () => {
    render(<House />);
    expect(screen.queryByText(/Pierwszy worek drewna/)).not.toBeInTheDocument();
    const outdoor = within(screen.getByRole('region', { name: 'Na świeżym powietrzu' }));
    expect(outdoor.getByText(/grill gazowy/)).toBeInTheDocument();
    expect(outdoor.getByText(/Bezpłatne miejsca parkingowe/)).toBeInTheDocument();
    const family = within(screen.getByRole('region', { name: 'Aktywnie i rodzinnie' }));
    expect(family.getByText(/deski SUP oraz małą łódkę wiosłową \(po wcześniejszym ustaleniu\)/)).toBeInTheDocument();
    expect(family.getByText(/Na życzenie przygotowujemy łóżeczko dziecięce oraz krzesełko do karmienia/)).toBeInTheDocument();
    expect(family.getByText(/Plac zabaw, piaskownica oraz trampolina/)).toBeInTheDocument();
    expect(screen.queryByText(/Rowery i SUP/)).not.toBeInTheDocument();
  });

  it('provides the complete inventory in four clearly labelled groups', () => {
    render(<House />);
    const inventory = within(screen.getByRole('region', { name: 'Pełna lista wyposażenia' }));
    for (const [name, count] of [
      ['Wnętrze i komfort', 5], ['Kuchnia', 7], ['Dla rodzin i dzieci', 3], ['Otoczenie i relaks', 7]
    ] as const) {
      expect(within(inventory.getByRole('region', { name })).getAllByRole('listitem')).toHaveLength(count);
    }
    for (const item of [
      'Ogrzewanie podłogowe w sypialni i łazience', 'Świeża pościel', 'Zmywarka',
      'Płyta indukcyjna', 'Lodówka z zamrażalnikiem', 'Czajnik elektryczny',
      'Komplet garnków, patelni, naczyń i sztućców', 'Łóżeczko dziecięce i krzesełko do karmienia (po uzgodnieniu)',
      'Plac zabaw, piaskownica i trampolina', 'Łódka wiosłowa i deska SUP (po uzgodnieniu)',
      'Bezpłatny parking na posesji', 'Obiekt przyjazny zwierzętom'
    ]) {
      expect(inventory.getByText(item)).toBeInTheDocument();
    }
  });

  it('uses the existing living room, terrace and football goal photos without changing the intro photo', () => {
    render(<House />);
    expect(screen.getAllByRole('img').map((image) => image.getAttribute('src'))).toEqual([
      '/glowne-foto kadr.jpg', '/shared image (7).jpg', '/shared image (13).jpg', '/bramka.jpg'
    ]);
  });

  it('provides the same sleeping layout, full inventory and conditions in English', async () => {
    await i18n.changeLanguage('en');
    render(<House />);
    expect(screen.getByRole('heading', {
      level: 1, name: 'About Domek na Mazurskiej – Discover the interiors and surroundings'
    })).toBeInTheDocument();
    expect(screen.getByText('Bedroom + mezzanine')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Comfortable sleeping spaces (2–6 guests)' })).toBeInTheDocument();
    expect(screen.getByText('Downstairs bedroom')).toBeInTheDocument();
    expect(screen.getByText('Cosy mezzanine')).toBeInTheDocument();
    expect(screen.getByText(/double sofa bed/)).toBeInTheDocument();
    const family = within(screen.getByRole('region', { name: 'Active days for the family' }));
    expect(family.getByText(/SUP boards and a small rowing boat are available on site by prior arrangement/)).toBeInTheDocument();
    expect(family.getByText(/A cot and high chair are available on request/)).toBeInTheDocument();
    const inventory = within(screen.getByRole('region', { name: 'Full equipment list' }));
    expect(inventory.getAllByRole('listitem')).toHaveLength(22);
    expect(inventory.getByText('Underfloor heating in the bedroom and bathroom')).toBeInTheDocument();
    expect(inventory.getByText('Drip coffee maker')).toBeInTheDocument();
    expect(inventory.getByText('Air conditioning')).toBeInTheDocument();
    expect(screen.queryByText(/first bag of firewood/)).not.toBeInTheDocument();
    expect(screen.queryByText(/house\.(stats|amenities|inventory)\./)).not.toBeInTheDocument();
  });
});
