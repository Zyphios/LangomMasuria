import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '../../utils/pricing';
import type { AdminBookingRow, BookingPriceInput, BookingPriceResult } from '../../types';

type Props = {
  booking: AdminBookingRow;
  disabled: boolean;
  onSave: (id: string, input: BookingPriceInput) => Promise<BookingPriceResult>;
  saveError?: string;
  onBlockingChange: (id: string, blocked: boolean) => void;
};

const parseAmount = (text: string): number | null => {
  const normalized = text.trim().replace(',', '.');
  return /^\d+(?:\.\d{1,2})?$/.test(normalized) && Number.isFinite(Number(normalized))
    ? Number(normalized) : null;
};

export default function BookingPriceEditor({ booking, disabled, onSave, saveError, onBlockingChange }: Props) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const mounted = useRef(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'amount' | 'discount'>(booking.discountPercent != null ? 'discount' : 'amount');
  const [value, setValue] = useState(booking.discountPercent ?? booking.totalPrice);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const editable = booking.status === 'PENDING' && Boolean(booking.expiresAt && new Date(booking.expiresAt).getTime() > Date.now());
  const original = Number(booking.originalTotalPrice ?? booking.totalPrice);
  const amount = parseAmount(value);
  const valid = amount !== null && amount <= (mode === 'discount' ? 100 : 99999999.99);
  const dirty = open && (mode === 'amount'
    ? booking.discountPercent != null || amount !== Number(booking.totalPrice)
    : booking.discountPercent == null || amount !== Number(booking.discountPercent));
  const total = !open || !editable ? Number(booking.totalPrice) : !valid || amount === null ? null : mode === 'amount' ? amount
    : Math.round(Math.round(original * 100) * (10000 - Math.round(amount * 100)) / 10000) / 100;
  const paidCents = Math.round(Number(booking.depositAmount) * 100);
  const totalCents = total === null ? null : Math.round(total * 100);
  const money = (value: number) => formatPrice(value, i18n.language);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; onBlockingChange(booking.id, false); };
  }, [booking.id, onBlockingChange]);
  useEffect(() => {
    onBlockingChange(booking.id, editable && (saving || dirty));
  }, [booking.id, editable, dirty, saving, onBlockingChange]);

  const reset = (show: boolean) => {
    setMode(booking.discountPercent != null ? 'discount' : 'amount');
    setValue(booking.discountPercent ?? booking.totalPrice);
    setError('');
    setSaved(false);
    setOpen(show);
  };
  const save = async () => {
    if (saving || disabled || !editable) return;
    if (!valid || amount === null) { setError(t('admin.priceEdit.invalid')); return; }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const result = await onSave(booking.id, mode === 'amount'
        ? { mode, totalPrice: amount } : { mode, discountPercent: amount });
      if (!mounted.current) return;
      setMode(result.discountPercent !== null ? 'discount' : 'amount');
      setValue(result.discountPercent ?? result.totalPrice);
      setSaved(true);
    } catch {
      if (!mounted.current) return;
      setError(t('admin.priceEdit.error'));
    } finally { if (mounted.current) setSaving(false); }
  };

  return <div className="min-w-[220px] max-w-xs py-3">
    <p>{money(Number(booking.totalPrice))} PLN</p>
    <p className="mt-1 text-sm">{t('admin.priceEdit.original', { amount: money(original) })}</p>
    {editable && !open && <button type="button" disabled={disabled} onClick={() => reset(true)}
      className="mt-2 min-h-11 underline">{t('admin.priceEdit.edit')}</button>}
    {open && editable && <fieldset disabled={disabled || saving} className="mt-3 min-w-0 space-y-3 rounded border p-3">
      <legend>{t('admin.priceEdit.edit')}</legend>
      <label className="block"><input type="radio" name={id} checked={mode === 'amount'} onChange={() => {
        setMode('amount'); setValue(booking.totalPrice); setSaved(false); setError('');
      }} /> {t('admin.priceEdit.manual')}</label>
      <label className="block"><input type="radio" name={id} checked={mode === 'discount'} onChange={() => {
        setMode('discount'); setValue(booking.discountPercent ?? '0'); setSaved(false); setError('');
      }} /> {t('admin.priceEdit.percent')}</label>
      <label className="block">{t(mode === 'amount' ? 'admin.priceEdit.amount' : 'admin.priceEdit.discount')}
        <input inputMode="decimal" value={value} className="mt-2 w-full min-w-0 rounded border px-2 py-2"
          onChange={(event) => { setValue(event.target.value); setSaved(false); setError(''); }} />
      </label>
      <button type="button" disabled={saving || !dirty} onClick={() => { void save(); }}
        className="min-h-11 rounded border px-3 py-2 disabled:opacity-60">
        {t(saving ? 'admin.deposit.saving' : 'admin.priceEdit.save')}
      </button>
      <button type="button" className="ml-2 min-h-11 underline" onClick={() => reset(false)}>{t('admin.priceEdit.cancel')}</button>
    </fieldset>}
    <div className="mt-2 space-y-1 text-sm" aria-live="polite">
      <p>{t('admin.priceEdit.final', { amount: total === null ? '—' : money(total) })}</p>
      <p>{t('admin.priceEdit.paid', { amount: money(paidCents / 100) })}</p>
      <p>{t('admin.priceEdit.remaining', { amount: totalCents === null ? '—' : money(Math.max(totalCents - paidCents, 0) / 100) })}</p>
      {totalCents !== null && paidCents > totalCents &&
        <p>{t('admin.priceEdit.overpayment', { amount: money((paidCents - totalCents) / 100) })}</p>}
    </div>
    {saved && <p role="status" className="mt-2 text-sm text-pine">{t('admin.priceEdit.saved')}</p>}
    {(error || saveError) && <p role="alert" className="mt-2 text-sm text-error">{error || saveError}</p>}
  </div>;
}
