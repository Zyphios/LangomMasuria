import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import House from './pages/House';
import Gallery from './pages/Gallery';
import Booking from './pages/Booking';
import Login from './pages/admin/Login';
import AdminLayout from './pages/admin/AdminLayout';
import AdminBookings from './pages/admin/AdminBookings';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminMessages from './pages/admin/AdminMessages';
import AdminGallery from './pages/admin/AdminGallery';
import AdminPricing from './pages/admin/AdminPricing';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path='/' element={<Home />} />
        <Route path='/house' element={<House />} />
        <Route path='/gallery' element={<Gallery />} />
        <Route path='/booking' element={<Booking />} />
      </Route>
      <Route path='/admin/login' element={<Login />} />
      <Route path='/admin' element={<AdminLayout />}>
        <Route index element={<Navigate to='/admin/bookings' replace />} />
        <Route path='bookings' element={<AdminBookings />} />
        <Route path='calendar' element={<AdminCalendar />} />
        <Route path='messages' element={<AdminMessages />} />
        <Route path='gallery' element={<AdminGallery />} />
        <Route path='pricing' element={<AdminPricing />} />
      </Route>
    </Routes>
  );
}
