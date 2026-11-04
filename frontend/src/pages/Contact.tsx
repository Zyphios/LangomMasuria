import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sendContactMessage } from '../api/contact';
import SocialLinks from '../components/SocialLinks';

const fieldClass = 'mt-2 w-full min-w-0 rounded-lg border border-outline bg-surface-container-lowest px-4 py-3 text-on-surface outline-none focus:border-primary';

export default function Contact() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', checkIn: '', checkOut: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const change = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSent(false);
    setError('');
  };
  const submit = async () => {
    if (sending) return;
    setSent(false);
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('contact.requiredError');
      return;
    }
    if ((form.checkIn || form.checkOut) && (!form.checkIn || !form.checkOut || form.checkOut <= form.checkIn)) {
      setError('contact.datesError');
      return;
    }
    const details = [
      form.phone.trim() ? `${t('contact.phonePrefix')}: ${form.phone.trim()}` : '',
      form.checkIn ? `${t('contact.datesPrefix')}: ${form.checkIn} – ${form.checkOut}` : ''
    ].filter(Boolean);
    const message = [...details, ...(details.length ? [''] : []), form.message.trim()].join('\n');
    setSending(true);
    try {
      await sendContactMessage({ name: form.name.trim(), email: form.email.trim(), message });
      setSent(true);
    } catch {
      setError('contact.sendError');
    } finally { setSending(false); }
  };

  return <div className="bg-background pb-section-gap pt-[var(--site-header-height)]">
    <section className="mx-auto max-w-container-max px-8 pt-16 md:px-margin-desktop">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">{t('contact.title')}</h1>
        <p className="mt-6 text-body-lg text-on-surface-variant">{t('contact.intro')}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <section aria-labelledby="contact-details-heading" className="min-w-0 rounded-[32px] bg-surface-container-low p-6 sm:p-8">
          <h2 id="contact-details-heading" className="text-headline-sm">{t('contact.detailsTitle')}</h2>
          <dl className="mt-8 space-y-6 text-body-md text-on-surface-variant">
            <div><dt className="font-semibold text-on-surface">{t('contact.phonePrefix')}</dt><dd className="mt-2">{t('contact.phoneSoon')}</dd></div>
            <div><dt className="font-semibold text-on-surface">{t('contact.email')}</dt><dd className="mt-2 break-all"><a href="mailto:domeknamazurskiej@gmail.com" className="underline hover:text-primary">domeknamazurskiej@gmail.com</a></dd></div>
            <div><dt className="font-semibold text-on-surface">{t('contact.address')}</dt><dd className="mt-2">ul. Mazurska 31G<br />19-330 Stare Juchy</dd></div>
          </dl>
          <Link to="/directions" className="mt-6 inline-flex min-h-11 items-center text-primary underline">{t('nav.directions')}</Link>
          <h3 className="mb-4 mt-8 text-body-lg font-semibold">{t('social.title')}</h3>
          <SocialLinks />
        </section>
        <section aria-labelledby="contact-form-heading" className="min-w-0 rounded-[32px] bg-surface-container-low p-6 sm:p-8">
          <h2 id="contact-form-heading" className="text-headline-sm">{t('contact.formTitle')}</h2>
          <p className="mt-4 text-body-md text-on-surface-variant">{t('contact.enquiryHint')} <Link to="/booking" className="text-primary underline">{t('nav.bookNow')}</Link></p>
          <form className="mt-8" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <fieldset disabled={sending} className="grid min-w-0 gap-5">
              <label>{t('contact.name')}<input autoComplete="given-name" required maxLength={100} className={fieldClass} value={form.name} onChange={(e) => change('name', e.target.value)} /></label>
              <label>{t('contact.email')}<input type="email" autoComplete="email" required maxLength={254} className={fieldClass} value={form.email} onChange={(e) => change('email', e.target.value)} /></label>
              <label>{t('contact.phone')}<input type="tel" autoComplete="tel" maxLength={50} className={fieldClass} value={form.phone} onChange={(e) => change('phone', e.target.value)} /></label>
              <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                <label className="min-w-0">{t('contact.checkIn')}<input type="date" className={fieldClass} value={form.checkIn} onChange={(e) => change('checkIn', e.target.value)} /></label>
                <label className="min-w-0">{t('contact.checkOut')}<input type="date" className={fieldClass} value={form.checkOut} onChange={(e) => change('checkOut', e.target.value)} /></label>
              </div>
              <label>{t('contact.message')}<textarea required rows={5} maxLength={10000} className={fieldClass} value={form.message} onChange={(e) => change('message', e.target.value)} /></label>
              <button type="submit" className="min-h-11 rounded-full bg-primary px-6 py-3 text-label-caps uppercase text-on-primary transition-colors hover:bg-surface-tint disabled:opacity-60">{t(sending ? 'contact.sending' : 'booking.sendMessage')}</button>
            </fieldset>
            {sent && <p role="status" aria-label={t('contact.resultLabel')} className="mt-4 text-primary">{t('booking.messageSent')}</p>}
            {error && <p role="alert" className="mt-4 text-error">{t(error)}</p>}
          </form>
        </section>
      </div>
    </section>
  </div>;
}
