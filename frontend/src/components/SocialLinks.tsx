import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSiteSettings } from '../api/siteSettings';

export default function SocialLinks({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['site-settings'], queryFn: getSiteSettings, refetchInterval: 30000, refetchOnWindowFocus: true
  });

  if (isError) return <p role="alert" className="max-w-56 text-sm text-error">
    {t('social.loadError')} <button type="button" className="underline" onClick={() => { void refetch(); }}>{t('links.retry')}</button>
  </p>;
  if (isPending || !data) return <span role="status" className="sr-only">{t('social.loading')}</span>;

  return <div role="group" aria-label={t('social.title')} className="flex flex-wrap items-center gap-2">
    {[
      { name: 'Facebook', url: data.facebookUrl, icon: <path d="M14 21v-8h3l.5-4H14V7c0-1 .3-2 2-2h2V1.5A24 24 0 0 0 15 1c-3 0-5 2-5 5v3H7v4h3v8z" /> },
      { name: 'Instagram', url: data.instagramUrl, icon: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1" /></> }
    ].map(({ name, url, icon }) => {
      const label = url ? name : `${name} — ${t('social.comingSoon')}`;
      const content = <><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor">{icon}</svg>
        {!compact && <span>{label}</span>}</>;
      const className = `inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-primary/25 p-3 text-sm text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${url ? '' : 'opacity-60'}`;
      return url
        ? <a key={name} href={url} aria-label={label} title={label} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className}>{content}</a>
        : <Link key={name} to="/" aria-label={label} title={label} onClick={onNavigate} className={className}>{content}</Link>;
    })}
  </div>;
}
