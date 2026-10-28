import { Navigate, useLocation } from 'react-router-dom';

export default function LegacySectionRedirect() {
  const { pathname, hash } = useLocation();
  const target =
    pathname === '/house' && hash === '#attractions' ? '/attractions' :
    pathname === '/gallery' && hash === '#rates' ? '/pricing' :
    null;

  return target ? <Navigate to={target} replace /> : null;
}
