import { useQuery } from '@tanstack/react-query';
import { getAvailability } from '../api/bookings';
import type { AvailabilityResponse } from '../types';

export const useAvailability = (month: number, year: number) =>
  useQuery({
    queryKey: ['availability', month, year],
    queryFn: () => getAvailability(month, year),
    refetchOnWindowFocus: true,
    refetchInterval: 30000
  });

export type VisibleMonths = { left: { month: number; year: number }; right: { month: number; year: number } };
export const initialVisibleMonths = (): VisibleMonths => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { left: { month: now.getMonth() + 1, year: now.getFullYear() },
    right: { month: next.getMonth() + 1, year: next.getFullYear() } };
};
export function useCalendarAvailability(months: VisibleMonths) {
  const left = useAvailability(months.left.month, months.left.year);
  const right = useAvailability(months.right.month, months.right.year);
  const merge = (key: keyof AvailabilityResponse) => Array.from(new Set([...(left.data?.[key] ?? []), ...(right.data?.[key] ?? [])]));
  return {
    blockedDates: merge('blockedDates'), pendingDates: merge('pendingDates'),
    confirmedDates: merge('confirmedDates'), manualBlockedDates: merge('manualBlockedDates'),
    disabled: !left.data || !right.data || left.isError || right.isError,
    isError: left.isError || right.isError,
    retry: () => { void left.refetch(); void right.refetch(); }
  };
}
