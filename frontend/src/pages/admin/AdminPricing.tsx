import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { updatePricingSeason, updatePricingSettings } from '../../api/admin';
import { getPricingSeasons, getPricingSettings } from '../../api/pricing';
import { ApiError } from '../../api/client';
import { getSeasonKind, sortPricingSeasons } from '../../utils/pricing';
import type { PricingSeason, PricingSettings } from '../../types';

type SeasonDraft = { pricePerNight: string; dateFrom: string; dateTo: string; minNights: string };
const inputClass = 'mt-2 min-w-0 w-full rounded border px-3 py-2';
const initialDraft = (season: PricingSeason): SeasonDraft => ({
  pricePerNight: season.pricePerNight, dateFrom: season.dateFrom.slice(0, 10), dateTo: season.dateTo.slice(0, 10),
  minNights: String(season.minNights)
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
  const { data: settings, isPending: settingsPending, isError: settingsLoadError, refetch: retrySettings } = useQuery({
    queryKey: ['pricing-settings'], queryFn: getPricingSettings, refetchInterval: 30000, refetchOnWindowFocus: true
  });
  const [settingsDraft, setSettingsDraft] = useState<PricingSettings | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

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
    const minNights = Number(draft.minNights);
    let validation = '';
    if (!/^\d+(?:\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) {
      validation = 'admin.pricingEditor.invalidPrice';
    } else if (!draft.dateFrom || !draft.dateTo || draft.dateFrom > draft.dateTo) {
      validation = 'admin.pricingEditor.invalidDates';
    } else if (!/^\d+$/.test(draft.minNights) || !Number.isInteger(minNights) || minNights < 2 || minNights > 2147483647) {
      validation = 'admin.pricingEditor.invalidMinimum';
    }
    if (validation) {
      setErrors((current) => ({ ...current, [season.id]: validation }));
      return;
    }
    setBusyId(season.id);
    setSavedId(null);
    setErrors((current) => ({ ...current, [season.id]: '' }));
    try {
      const updated = await updatePricingSeason(token, { ...season, ...draft, pricePerNight: String(amount), minNights });
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

  const saveSettings = async () => {
    if (settingsBusy) return;
    const draft = settingsDraft ?? settings;
    if (!draft || [draft.minStayTextPl, draft.minStayTextEn].some((text) => !text.trim() || text.trim().length > 2000)) {
      setSettingsError('admin.pricingEditor.invalidDescription');
      return;
    }
    setSettingsBusy(true);
    setSettingsSaved(false);
    setSettingsError('');
    try {
      const updated = await updatePricingSettings(token, {
        minStayTextPl: draft.minStayTextPl.trim(), minStayTextEn: draft.minStayTextEn.trim()
      });
      await client.cancelQueries({ queryKey: ['pricing-settings'] });
      client.setQueryData<PricingSettings>(['pricing-settings'], updated);
      setSettingsDraft(null);
      setSettingsSaved(true);
      void client.invalidateQueries({ queryKey: ['pricing-settings'] });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      }
      setSettingsError('admin.pricingEditor.descriptionSaveError');
    } finally { setSettingsBusy(false); }
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
            <label className="mt-4 block">
              {t('admin.pricingEditor.minNights')}
              <input type="number" min="2" max="2147483647" step="1" inputMode="numeric"
                className={inputClass} value={draft.minNights}
                onChange={(event) => change(season, 'minNights', event.target.value)} />
            </label>
            <button type="button" disabled={busyId !== null} onClick={() => { void submit(season); }}
              className="mt-4 min-h-11 rounded bg-pine px-4 py-2 font-medium text-white transition-colors hover:bg-pine-dark disabled:opacity-60">
              {t(busyId === season.id ? 'admin.deposit.saving' : 'admin.pricingEditor.save')}
            </button>
            {savedId === season.id && <p role="status" className="mt-3 text-pine">{t('admin.deposit.saved')}</p>}
            {errors[season.id] && <p role="alert" className="mt-3 text-error">{t(errors[season.id])}</p>}
          </fieldset>;
        })}
      </div>
      <section className="mt-8 border-t pt-6">
        <h2 id="pricing-description-heading" className="text-xl font-semibold">{t('admin.pricingEditor.descriptionTitle')}</h2>
        <p className="mt-3 text-on-surface-variant">{t('admin.pricingEditor.descriptionHelp')}</p>
        {settingsPending && <p role="status" className="mt-4">{t('pricing.descriptionLoading')}</p>}
        {settingsLoadError && <p role="alert" className="mt-4 text-error">{t('pricing.descriptionLoadError')}
          <button type="button" className="ml-3 underline" onClick={() => { void retrySettings(); }}>{t('links.retry')}</button>
        </p>}
        {settings && <form aria-labelledby="pricing-description-heading" className="mt-4"
          onSubmit={(event) => { event.preventDefault(); void saveSettings(); }}>
          <div className="grid gap-4 md:grid-cols-2">
            {(['minStayTextPl', 'minStayTextEn'] as const).map((key) => (
              <label key={key} className="min-w-0">
                {t(key === 'minStayTextPl' ? 'admin.pricingEditor.descriptionPl' : 'admin.pricingEditor.descriptionEn')}
                <textarea rows={4} maxLength={2000} disabled={settingsBusy} className={inputClass}
                  value={(settingsDraft ?? settings)[key]}
                  onChange={(event) => {
                    setSettingsDraft((current) => ({ ...(current ?? settings), [key]: event.target.value }));
                    setSettingsError('');
                    setSettingsSaved(false);
                  }} />
              </label>
            ))}
          </div>
          <button type="submit" disabled={settingsBusy}
            className="mt-4 min-h-11 rounded bg-pine px-4 py-2 font-medium text-white transition-colors hover:bg-pine-dark disabled:opacity-60">
            {t(settingsBusy ? 'admin.deposit.saving' : 'admin.pricingEditor.saveDescription')}
          </button>
          {settingsSaved && <p role="status" className="mt-3 text-pine">{t('admin.deposit.saved')}</p>}
          {settingsError && <p role="alert" className="mt-3 text-error">{t(settingsError)}</p>}
        </form>}
      </section>
    </div>
  );
}
