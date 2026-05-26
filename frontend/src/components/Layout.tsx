import type { PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className='min-h-screen bg-background font-sans text-on-background'>
      <Navbar />
      <main>{children || <Outlet />}</main>
      <Footer />
    </div>
  );
}
