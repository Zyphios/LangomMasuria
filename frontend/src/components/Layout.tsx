import type { PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className='min-h-screen bg-sand text-slate-900'>
      <Navbar />
      <main>{children || <Outlet />}</main>
      <Footer />
    </div>
  );
}
