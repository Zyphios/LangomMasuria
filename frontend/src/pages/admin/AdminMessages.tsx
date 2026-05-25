import { useEffect, useState } from 'react';
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
  
  useEffect(() => {
    getAdminMessages(token).then(setMessages);
  }, [token]);
  
  const markRead = async (id: string) => {
    await markMessageRead(token, id);
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, isRead: true } : message)));
  };
  
  return (
    <div className='rounded-2xl bg-white p-6 shadow-sm'>
      <h1 className='text-3xl font-semibold'>Wiadomości</h1>
      <div className='mt-6 space-y-4'>
        {messages.map((message) => (
          <article key={message.id} className='rounded border p-4'>
            <p className='font-semibold'>{message.name}</p>
            <p>{message.email}</p>
            <p className='mt-2'>{message.message}</p>
            <button type='button' onClick={() => markRead(message.id)} className='mt-3 rounded border px-3 py-1'>
              Mark read
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
