import type { PricingSeason } from '../types';

export const getSeasonKind = (season: PricingSeason): 'low' | 'high' | 'holidays' =>
  season.namePl.includes('Święta') ? 'holidays' : season.isFeatured ? 'high' : 'low';

export const sortPricingSeasons = (seasons: PricingSeason[]) => {
  const order = { low: 0, high: 1, holidays: 2 };
  return [...seasons].sort((a, b) => order[getSeasonKind(a)] - order[getSeasonKind(b)] ||
    a.dateFrom.localeCompare(b.dateFrom) || a.id.localeCompare(b.id));
};

export const formatPrice = (amount: number | string, language: string) => {
  const value = Number(amount);
  return value.toLocaleString(language === 'en' ? 'en-GB' : 'pl-PL', {
    useGrouping: false,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  });
};

export function estimateStayPrice(seasons: PricingSeason[], checkIn: string, checkOut: string): number | null {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn).getTime();
  const nights = (new Date(checkOut).getTime() - start) / 86400000;
  if (!Number.isInteger(nights) || nights < 1) return null;
  let totalCents = 0;
  for (let index = 0; index < nights; index += 1) {
    const date = new Date(start + index * 86400000).toISOString().slice(0, 10);
    const matching = seasons.filter((season) => season.dateFrom.slice(0, 10) <= date && season.dateTo.slice(0, 10) >= date);
    const season = matching.find((entry) => getSeasonKind(entry) === 'holidays') ?? matching[0];
    if (!season) return null;
    const amount = Number(season.pricePerNight);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    totalCents += Math.round(amount * 100);
  }
  return totalCents / 100;
}
