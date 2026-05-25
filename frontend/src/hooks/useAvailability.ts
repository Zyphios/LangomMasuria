import { useQuery } from '@tanstack/react-query';
import { getAvailability } from '../api/bookings';

export const useAvailability = (month: number, year: number) =>
  useQuery({
    queryKey: ['availability', month, year],
    queryFn: () => getAvailability(month, year)
  });
