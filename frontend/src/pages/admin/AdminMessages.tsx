import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../api/client';
import { getAdminMessages, markMessageRead } from '../../api/admin';
import type { AdminMessage } from '../../types';

export default function AdminMessages() {
  const { t } = useTranslation();
  const token = localStorage.getItem('adminToken') || '';
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [showRead, setShowRead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [markError, setMarkError] = useState('');
  const mounted = useRef(false);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    getAdminMessages(token)
      .then((rows) => {
        if (!active) return;
        setMessages(rows);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem('adminToken');
          window.location.href = '/admin/login';
        }
        setError('admin.messageList.loadError');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [token]);

  const markRead = async (id: string) => {
    if (readingId !== null) return;
    setReadingId(id);
    setMarkError('');
    try {
      const result = await markMessageRead(token, id);
      if (!mounted.current) return;
      setMessages((current) => current.map((message) => (message.id === id ? { ...message, isRead: result.isRead } : message)));
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      }
      setMarkError('admin.messageList.markError');
    } finally {
      if (mounted.current) setReadingId(null);
    }
  };

  const readCount = messages.filter((message) => message.isRead).length;
  const visibleMessages = messages.filter((message) => message.isRead === showRead);

  return (
    <div className='min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-6'>
      <h1 className='text-3xl font-semibold'>{t('admin.messages')}</h1>
      {loading && <p role="status" className="mt-4">{t('admin.messageList.loading')}</p>}
      {error && <p role="alert" className='mt-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700'>{t(error)}</p>}
      {markError && <p role="alert" className='mt-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700'>{t(markError)}</p>}
      {!loading && !error && <>
        <div role="group" aria-label={t('admin.messages')} className="mt-6 flex flex-wrap gap-2">
          {[false, true].map((read) => (
            <button key={String(read)} type="button" aria-pressed={showRead === read} onClick={() => setShowRead(read)}
              className={`min-h-11 rounded-full border px-4 py-1 text-sm transition-colors ${
                showRead === read ? 'border-pine bg-pine text-white' : 'border-outline hover:bg-surface-container'
              }`}>
              {t(read ? 'admin.messageList.read' : 'admin.messageList.unread')} ({read ? readCount : messages.length - readCount})
            </button>
          ))}
        </div>
        {visibleMessages.length === 0 && <p className="mt-6 text-on-surface-variant">
          {t(showRead ? 'admin.messageList.emptyRead' : 'admin.messageList.emptyUnread')}
        </p>}
        <div className='mt-6 space-y-4'>
          {visibleMessages.map((message) => (
            <article key={message.id} className='min-w-0 rounded border p-4 [overflow-wrap:anywhere]'>
              <p className='font-semibold'>{message.name}</p>
              <p>{message.email}</p>
              <p className='mt-2 whitespace-pre-wrap'>{message.message}</p>
              {!message.isRead && <button
                type='button'
                disabled={readingId !== null}
                onClick={() => { void markRead(message.id); }}
                className='mt-3 min-h-11 rounded border border-outline px-3 py-1 text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60'
              >
                {t(readingId === message.id ? 'admin.messageList.marking' : 'admin.messageList.markRead')}
              </button>}
            </article>
          ))}
        </div>
      </>}
    </div>
  );
}
