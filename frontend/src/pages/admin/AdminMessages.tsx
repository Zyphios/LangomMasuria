import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { getAdminMessages, markMessageRead } from '../../api/admin';

type MessageRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  isRead: boolean;
};

export default function AdminMessages() {
  const token = localStorage.getItem('adminToken') || '';
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [error, setError] = useState('');
  
  useEffect(() => {
    getAdminMessages(token)
      .then((rows) => {
        setMessages(rows);
        setError('');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem('adminToken');
          window.location.href = '/admin/login';
          return;
        }
        setError('Nie udało się pobrać wiadomości. Spróbuj odświeżyć stronę.');
      });
  }, [token]);
  
  const markRead = async (id: string) => {
    await markMessageRead(token, id);
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, isRead: true } : message)));
  };
  
  return (
    <div className='rounded-2xl bg-white p-6 shadow-sm'>
      <h1 className='text-3xl font-semibold'>Wiadomości</h1>
      {error ? <p className='mt-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700'>{error}</p> : null}
      {!error && messages.length === 0 ? <p className='mt-6 text-on-surface-variant'>Brak wiadomości.</p> : null}
      <div className='mt-6 space-y-4'>
        {messages.map((message) => (
          <article key={message.id} className='rounded border p-4'>
            <p className='font-semibold'>{message.name}</p>
            <p>{message.email}</p>
            <p className='mt-2'>{message.message}</p>
            <button
              type='button'
              onClick={() => markRead(message.id)}
              className='mt-3 rounded border border-outline px-3 py-1 text-on-surface transition-colors hover:bg-surface-container'
            >
              Mark read
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
