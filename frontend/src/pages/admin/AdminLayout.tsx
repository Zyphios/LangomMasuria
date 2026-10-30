import { Link, Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLayout() {
  const { t } = useTranslation();
  const auth = useAuth();
  
  if (!auth.isAuthenticated) return <Navigate to='/admin/login' replace />;
  
  return (
    <div className='mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row'>
      <aside className='w-full shrink-0 rounded-2xl bg-white p-6 shadow-sm md:w-48 lg:w-64'>
        <nav className='grid grid-cols-2 gap-3 md:flex md:flex-col'>
          <Link to='/admin/bookings'>{t('admin.bookings')}</Link>
          <Link to='/admin/calendar'>{t('admin.calendar')}</Link>
          <Link to='/admin/messages'>{t('admin.messages')}</Link>
          <Link to='/admin/gallery'>{t('admin.gallery')}</Link>
          <Link to='/admin/pricing'>{t('admin.pricing')}</Link>
          <button
            type='button'
            onClick={auth.logout}
            className='rounded border border-outline px-3 py-2 text-left text-on-surface transition-colors hover:bg-surface-container'
          >
            {t('admin.logout')}
          </button>
        </nav>
      </aside>
      <section className='min-w-0 flex-1'>
        <Outlet />
      </section>
    </div>
  );
}
