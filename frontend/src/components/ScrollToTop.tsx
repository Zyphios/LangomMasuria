import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router does not reset scroll position on navigation. Without this, moving between
 * long pages (e.g. from a scrolled-down Gallery to Booking) leaves the viewport wherever it
 * was, which makes navigation feel broken. This scrolls to the top whenever the route changes.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
