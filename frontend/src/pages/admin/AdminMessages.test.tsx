import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminMessages from './AdminMessages';
import * as adminApi from '../../api/admin';
import { ApiError } from '../../api/client';
import i18n from '../../i18n';

const messages = [
  { id: 'unread', name: 'Unread guest', email: 'unread@example.invalid', message: 'Unread body', isRead: false,
    createdAt: '2026-10-29T10:00:00Z' },
  { id: 'read', name: 'Read guest', email: 'read@example.invalid', message: 'Previously read body', isRead: true,
    createdAt: '2026-10-28T10:00:00Z' }
];

beforeEach(async () => {
  localStorage.setItem('adminToken', 'synthetic-admin-token');
  await i18n.changeLanguage('pl');
  vi.spyOn(adminApi, 'getAdminMessages').mockResolvedValue(messages);
  vi.spyOn(adminApi, 'markMessageRead').mockResolvedValue({ isRead: true });
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  await i18n.changeLanguage('pl');
});

describe('admin message categories', () => {
  it('defaults to unread messages and offers the read category with counts', async () => {
    render(<AdminMessages />);
    expect(await screen.findByRole('button', { name: 'Nieodczytane (1)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Unread body')).toBeInTheDocument();
    expect(screen.queryByText('Previously read body')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Odczytane (1)' }));
    expect(screen.getByText('Previously read body')).toBeInTheDocument();
    expect(screen.queryByText('Unread body')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Oznacz jako odczytaną' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Odczytane (1)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves a message and changes counts only after server acknowledgement', async () => {
    let resolve!: (value: { isRead: true }) => void;
    vi.mocked(adminApi.markMessageRead).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render(<AdminMessages />);
    const button = await screen.findByRole('button', { name: 'Oznacz jako odczytaną' });
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Oznaczanie…' })).toBeDisabled();
    expect(screen.getByText('Unread body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nieodczytane (1)' })).toBeInTheDocument();
    fireEvent.click(button);
    expect(adminApi.markMessageRead).toHaveBeenCalledTimes(1);
    expect(adminApi.markMessageRead).toHaveBeenCalledWith('synthetic-admin-token', 'unread');
    await act(async () => { resolve({ isRead: true }); });
    expect(screen.getByRole('button', { name: 'Nieodczytane (0)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Odczytane (2)' })).toBeInTheDocument();
    expect(screen.getByText('Brak nieodczytanych wiadomości.')).toBeInTheDocument();
    expect(screen.queryByText('Unread body')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Odczytane (2)' }));
    expect(screen.getByText('Unread body')).toBeInTheDocument();
    expect(screen.getByText('Previously read body')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Oznacz jako odczytaną' })).not.toBeInTheDocument();
  });

  it('keeps a failed message unread and supports retry without false success', async () => {
    vi.mocked(adminApi.markMessageRead).mockRejectedValueOnce(new Error('synthetic failure'));
    render(<AdminMessages />);
    fireEvent.click(await screen.findByRole('button', { name: 'Oznacz jako odczytaną' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się oznaczyć wiadomości jako odczytanej');
    expect(screen.getByText('Unread body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nieodczytane (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Odczytane (1)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Oznacz jako odczytaną' }));
    await screen.findByRole('button', { name: 'Nieodczytane (0)' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uses the persisted read state when the panel is opened again', async () => {
    const view = render(<AdminMessages />);
    fireEvent.click(await screen.findByRole('button', { name: 'Oznacz jako odczytaną' }));
    await screen.findByRole('button', { name: 'Odczytane (2)' });
    view.unmount();
    vi.mocked(adminApi.getAdminMessages).mockResolvedValue(messages.map((message) => ({ ...message, isRead: true })));
    render(<AdminMessages />);
    expect(await screen.findByText('Brak nieodczytanych wiadomości.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Odczytane (2)' }));
    expect(screen.getByText('Unread body')).toBeInTheDocument();
  });

  it('does not present an empty category while messages are loading', async () => {
    let resolve!: (value: typeof messages) => void;
    vi.mocked(adminApi.getAdminMessages).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render(<AdminMessages />);
    expect(screen.getByRole('status')).toHaveTextContent('Ładowanie wiadomości…');
    expect(screen.queryByText(/Brak.*wiadomości/)).not.toBeInTheDocument();
    await act(async () => { resolve(messages); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Unread body')).toBeInTheDocument();
  });

  it('shows load failure rather than an empty inbox', async () => {
    vi.mocked(adminApi.getAdminMessages).mockRejectedValueOnce(new Error('synthetic load failure'));
    render(<AdminMessages />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się pobrać wiadomości');
    expect(screen.queryByText(/Brak.*wiadomości/)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('distinguishes empty unread and read categories', async () => {
    vi.mocked(adminApi.getAdminMessages).mockResolvedValueOnce([]);
    render(<AdminMessages />);
    expect(await screen.findByText('Brak nieodczytanych wiadomości.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Odczytane (0)' }));
    expect(screen.getByText('Brak odczytanych wiadomości.')).toBeInTheDocument();
  });

  it('translates message filters and mutation errors into English', async () => {
    await i18n.changeLanguage('en');
    vi.mocked(adminApi.markMessageRead).mockRejectedValueOnce(new Error('synthetic failure'));
    render(<AdminMessages />);
    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Unread (1)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not mark the message as read');
    fireEvent.click(screen.getByRole('button', { name: 'Read (1)' }));
    expect(screen.getByText('Previously read body')).toBeInTheDocument();
  });

  it.each(['load', 'mark'])('clears expired authentication on %s', async (operation) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    if (operation === 'load') vi.mocked(adminApi.getAdminMessages).mockRejectedValueOnce(new ApiError('Unauthorized', 401));
    else vi.mocked(adminApi.markMessageRead).mockRejectedValueOnce(new ApiError('Unauthorized', 401));
    render(<AdminMessages />);
    if (operation === 'mark') fireEvent.click(await screen.findByRole('button', { name: 'Oznacz jako odczytaną' }));
    await waitFor(() => { expect(localStorage.getItem('adminToken')).toBeNull(); });
  });
});
