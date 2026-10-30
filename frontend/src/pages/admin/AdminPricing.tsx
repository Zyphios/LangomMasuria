import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { updatePricingSeason } from '../../api/admin';
import { getPricingSeasons } from '../../api/pricing';
import { ApiError } from '../../api/client';
import { getSeasonKind, sortPricingSeasons } from '../../utils/pricing';
import type { PricingSeason } from '../../types';

type SeasonDraft = { pricePerNight: string; dateFrom: string; dateTo: string };
const initialDraft = (season: PricingSeason): SeasonDraft => ({
  pricePerNight: season.pricePerNight, dateFrom: season.dateFrom.slice(0, 10), dateTo: season.dateTo.slice(0, 10)
});

export default function AdminPricing() {
  const { t } = useTranslation();
  const token = localStorage.getItem('adminToken') || '';
  const client = useQueryClient();
  const { data: pricing = [], isPending, isError, refetch } = useQuery({
    queryKey: ['pricing'], queryFn: getPricingSeasons, refetchInterval: 30000, refetchOnWindowFocus: true
  });
  const [drafts, setDrafts] = useState<Record<string, SeasonDraft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const change = (season: PricingSeason, key: keyof SeasonDraft, value: string) => {
    setDrafts((current) => ({ ...current, [season.id]: { ...(current[season.id] ?? initialDraft(season)), [key]: value } }));
    setErrors((current) => ({ ...current, [season.id]: '' }));
    if (savedId === season.id) setSavedId(null);
  };

  const submit = async (season: PricingSeason) => {
    if (busyId) return;
    const draft = drafts[season.id] ?? initialDraft(season);
    const amountText = draft.pricePerNight.trim().replace(',', '.');
    const amount = Number(amountText);
    let validation = '';
    if (!/^\d+(?:\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) {
      validation = 'admin.pricingEditor.invalidPrice';
    } else if (!draft.dateFrom || !draft.dateTo || draft.dateFrom > draft.dateTo) {
      validation = 'admin.pricingEditor.invalidDates';
    }
    if (validation) {
      setErrors((current) => ({ ...current, [season.id]: validation }));
      return;
    }
    setBusyId(season.id);
    setSavedId(null);
    setErrors((current) => ({ ...current, [season.id]: '' }));
    try {
      const updated = await updatePricingSeason(token, { ...season, ...draft, pricePerNight: String(amount) });
      await client.cancelQueries({ queryKey: ['pricing'] });
      client.setQueryData<PricingSeason[]>(['pricing'], (current) =>
        current?.map((entry) => entry.id === updated.id ? updated : entry));
      setDrafts((current) => {
        const next = { ...current };
        delete next[season.id];
        return next;
      });
      setSavedId(season.id);
      void client.invalidateQueries({ queryKey: ['pricing'] });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      }
      const key = error instanceof ApiError && error.code === 'PRICING_OVERLAP'
        ? 'admin.pricingEditor.overlap' : 'admin.pricingEditor.saveError';
      setErrors((current) => ({ ...current, [season.id]: key }));
    } finally { setBusyId(null); }
  };

  return (
    <div className='min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-6'>
      <h1 className='text-3xl font-semibold'>{t('admin.pricing')}</h1>
      <p className="mt-3 text-on-surface-variant">{t('admin.pricingEditor.help')}</p>
      {isPending && <p role="status" className="mt-4">{t('pricing.loading')}</p>}
      {isError && <p role="alert" className="mt-4 text-error">{t('pricing.loadError')}
        <button type="button" className="ml-3 underline" onClick={() => { void refetch(); }}>{t('links.retry')}</button>
      </p>}
      {!isPending && !isError && pricing.length === 0 && <p className="mt-4">{t('pricing.empty')}</p>}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {sortPricingSeasons(pricing).map((season) => {
          const draft = drafts[season.id] ?? initialDraft(season);
          const inputClass = 'mt-2 min-w-0 w-full rounded border px-3 py-2';
          return <fieldset key={season.id} disabled={busyId === season.id} className="min-w-0 rounded-xl border p-4">
            <legend className="px-2 text-lg font-semibold">{t(`pricing.${getSeasonKind(season)}`)}</legend>
            <label className="block">
              {t('admin.pricingEditor.price')}
              <input inputMode="decimal" className={inputClass} value={draft.pricePerNight}
                onChange={(event) => change(season, 'pricePerNight', event.target.value)} />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="min-w-0">{t('admin.pricingEditor.from')}
                <input type="date" className={inputClass} value={draft.dateFrom}
                  onChange={(event) => change(season, 'dateFrom', event.target.value)} />
              </label>
              <label className="min-w-0">{t('admin.pricingEditor.to')}
                <input type="date" className={inputClass} value={draft.dateTo}
                  onChange={(event) => change(season, 'dateTo', event.target.value)} />
              </label>
            </div>
            <button type="button" disabled={busyId !== null} onClick={() => { void submit(season); }}
              className="mt-4 min-h-11 rounded bg-pine px-4 py-2 font-medium text-white transition-colors hover:bg-pine-dark disabled:opacity-60">
              {t(busyId === season.id ? 'admin.deposit.saving' : 'admin.pricingEditor.save')}
            </button>
            {savedId === season.id && <p role="status" className="mt-3 text-pine">{t('admin.deposit.saved')}</p>}
            {errors[season.id] && <p role="alert" className="mt-3 text-error">{t(errors[season.id])}</p>}
          </fieldset>;
        })}
      </div>
    </div>
  );
}
