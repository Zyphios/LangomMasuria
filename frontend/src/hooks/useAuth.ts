import { useMemo, useState } from 'react';

export const useAuth = () => {
  const [token, setToken] = useState(() => localStorage.getItem('adminToken') || '');
  
  return useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login: (nextToken: string) => {
        localStorage.setItem('adminToken', nextToken);
        setToken(nextToken);
      },
      logout: () => {
        localStorage.removeItem('adminToken');
        setToken('');
      }
    }),
    [token]
  );
};
