const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    },
    ...init
  });
  
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(body.message || 'Request failed');
  }
  
  if (response.status === 204) return undefined as T;
  
  return response.json() as Promise<T>;
}
