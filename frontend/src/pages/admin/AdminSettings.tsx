import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getSiteSettings } from '../../api/siteSettings';
import { updateSiteSettings } from '../../api/admin';
import { ApiError } from '../../api/client';
import type { SiteSettings } from '../../types';

function isValidLink(value: string) {
  if (value === '') return true;
  try { return value.length <= 2048 && value.startsWith('https://') && new URL(value).protocol === 'https:'; }
  catch { return false; }
}

export default function AdminSettings() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['site-settings'], queryFn: getSiteSettings, refetchInterval: 30000, refetchOnWindowFocus: true
  });
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (busy || !data) return;
    const input = draft ?? data;
    const settings = { facebookUrl: input.facebookUrl.trim(), instagramUrl: input.instagramUrl.trim() };
    setSaved(false);
    setError('');
    if (!Object.values(settings).every(isValidLink)) {
      setError('admin.siteSettings.invalidUrl');
      return;
    }
    setBusy(true);
    try {
      const updated = await updateSiteSettings(localStorage.getItem('adminToken') || '', settings);
      await client.cancelQueries({ queryKey: ['site-settings'] });
      client.setQueryData<SiteSettings>(['site-settings'], updated);
      setDraft(null);
      setSaved(true);
      void client.invalidateQueries({ queryKey: ['site-settings'] });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      }
      setError('admin.siteSettings.saveError');
    } finally { setBusy(false); }
  };

  return <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
    <h1 className="text-3xl font-semibold">{t('admin.settings')}</h1>
    <h2 className="mt-6 text-xl font-semibold">{t('social.title')}</h2>
    <p className="mt-3 text-on-surface-variant">{t('admin.siteSettings.hint')}</p>
    {isPending && <p role="status" className="mt-4">{t('social.loading')}</p>}
    {isError && <p role="alert" className="mt-4 text-error">{t('social.loadError')} <button type="button" className="underline" onClick={() => { void refetch(); }}>{t('links.retry')}</button></p>}
    {data && <form noValidate className="mt-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={busy} className="grid min-w-0 gap-5">
        {(['facebookUrl', 'instagramUrl'] as const).map((key) => <label key={key} className="min-w-0">
          {t(`admin.siteSettings.${key}`)}
          <input type="url" maxLength={2048} value={(draft ?? data)[key]}
            className="mt-2 w-full rounded-lg border border-outline px-3 py-3"
            onChange={(event) => {
              setDraft((current) => ({ ...(current ?? data), [key]: event.target.value }));
              setSaved(false);
              setError('');
            }} />
        </label>)}
        <button type="submit" className="min-h-11 rounded-lg bg-pine px-5 py-3 text-white disabled:opacity-60">{t(busy ? 'admin.deposit.saving' : 'admin.siteSettings.save')}</button>
      </fieldset>
      {saved && <p role="status" className="mt-4 text-pine">{t('admin.deposit.saved')}</p>}
      {error && <p role="alert" className="mt-4 text-error">{t(error)}</p>}
    </form>}
  </section>;
}
