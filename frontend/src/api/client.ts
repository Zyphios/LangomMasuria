const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Carries the HTTP status alongside the message so callers can distinguish e.g. an expired
// admin session (401) from a validation error (400) and react accordingly (redirect to login
// vs. show an inline message).
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Request failed' }));
    if (Array.isArray(body.issues) && body.issues.length > 0) {
      const fieldMessages: Record<string, string> = {
        guestEmail: 'Podany adres e-mail jest nieprawidłowy',
        guestName: 'Podaj imię i nazwisko gościa',
        guestPhone: 'Podaj numer telefonu gościa',
        checkIn: 'Nieprawidłowa data zameldowania',
        checkOut: 'Nieprawidłowa data wymeldowania',
        pricePerNight: 'Cena za noc musi być liczbą dodatnią',
        discountPercent: 'Rabat musi być liczbą od 0 do 100',
        depositAmount: 'Zaliczka musi być liczbą nieujemną',
        guestsCount: 'Liczba gości musi być od 1 do 8'
      };
      const firstIssue = body.issues[0];
      const field = Array.isArray(firstIssue.path) ? firstIssue.path[0] : undefined;
      throw new ApiError((field && fieldMessages[field]) || firstIssue.message || body.message || 'Request failed', response.status);
    }
    throw new ApiError(body.message || 'Request failed', response.status);
  }
  
  if (response.status === 204) return undefined as T;
  
  return response.json() as Promise<T>;
}
