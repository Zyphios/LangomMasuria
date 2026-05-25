import { Link, Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLayout() {
  const { t } = useTranslation();
  const auth = useAuth();
  
  if (!auth.isAuthenticated) return <Navigate to='/admin/login' replace />;
  
  return (
    <div className='mx-auto flex max-w-6xl gap-8 px-6 py-10'>
      <aside className='w-64 rounded-2xl bg-white p-6 shadow-sm'>
        <nav className='flex flex-col gap-3'>
          <Link to='/admin/bookings'>{t('admin.bookings')}</Link>
          <Link to='/admin/calendar'>{t('admin.calendar')}</Link>
          <Link to='/admin/messages'>{t('admin.messages')}</Link>
          <Link to='/admin/gallery'>{t('admin.gallery')}</Link>
          <Link to='/admin/pricing'>{t('admin.pricing')}</Link>
          <button type='button' onClick={auth.logout} className='rounded border px-3 py-2 text-left'>
            {t('admin.logout')}
          </button>
        </nav>
      </aside>
      <section className='flex-1'>
        <Outlet />
      </section>
    </div>
  );
}
