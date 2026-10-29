# Admin Panel Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The owner selected inline execution without subagents.

**Goal:** Make deposit saves visibly acknowledge success, show date-only stays, and separate unread/read messages without changing booking rules.

**Architecture:** Keep the existing authenticated endpoints and React state-driven admin views. Add per-booking save feedback and server-acknowledged message filtering; forward failures through the existing Express error middleware. Reuse the locally completed booking lifecycle and block management.

**Tech Stack:** React 18, TypeScript, react-i18next, TanStack Query 5, Vitest 2, Testing Library, Express, Prisma 5, Jest, isolated PostgreSQL 16.

**Spec:** `docs\superpowers\specs\2026-10-29-admin-panel-feedback-design.md` (approved by owner).

## Global Constraints

- „Pracujemy w obecnym katalogu i na obecnej gałęzi, bez dodatkowego worktree i bez podagentów.”
- „Zachowujemy wcześniejsze niezacommitowane zmiany.”
- „Nie zmieniamy kontraktów endpointów ani modelu danych.”
- „Nie wdrażamy niczego automatycznie.”
- „Odczytanie nie usuwa wiadomości.”
- „Nie zmieniamy zasad rozliczeń, nie dodajemy wysyłania maila po zmianie zaliczki ani nowych formatów wpisywania kwoty.”
- PL/EN for new interface copy; match existing styles; no new dependencies.
- PostgreSQL tests use only `postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test`, never production or copied customer data.
- Windows paths and PowerShell commands; no dependency installation unless a validation command reports a missing dependency.
- Existing source files contain mixed, uncommitted earlier work. Do not stage entire files or commit an incomplete release. Commit this plan alone; leave implementation persistent in the current workspace for the coherent release.

## File responsibilities

| File | Responsibility |
|---|---|
| `backend\src\routes\admin.ts` | Forward async failures for the deposit and two message handlers |
| `backend\tests\admin.test.ts` | Verify error responses, deposits and persisted message state |
| `frontend\src\pages\admin\AdminBookings.tsx` | Per-row saving/saved/error states, timer cleanup, date-only display |
| `frontend\src\pages\admin\AdminBookings.feedback.test.tsx` | Save timing, failures, separate rows, ISO display and PL/EN regressions |
| `frontend\src\pages\admin\AdminMessages.tsx` | Read/unread filters, counts and acknowledged mutations |
| `frontend\src\pages\admin\AdminMessages.test.tsx` | Filtering, request timing, failure/loading/empty states and PL/EN |
| `frontend\src\types\index.ts` | Typed admin message payload |
| `frontend\src\api\admin.ts` | Replace message `any[]` with the shared type |
| `frontend\src\i18n\pl.json`, `frontend\src\i18n\en.json` | New admin feedback and message labels |

---

### Task 1: Reliable admin API responses

**Files:** Modify `backend\src\routes\admin.ts`; test `backend\tests\admin.test.ts`.

**Interfaces:**
- Consumes: authenticated `GET /api/admin/messages`, `PATCH /api/admin/messages/:id` with `{ isRead: boolean }`, and `PATCH /api/admin/bookings/:id/deposit` with `{ depositAmount: number }`.
- Produces: unchanged success payloads, and JSON HTTP 500 through the existing middleware when Prisma rejects.

- [ ] **Step 1: Add focused regressions.**

Extend the existing marked-read test with a subsequent authenticated GET asserting the message still has `isRead: true`. Add separate tests rejecting `prisma.contactMessage.findMany`, `prisma.contactMessage.update`, and `prisma.booking.update` once. For example:

```ts
const failure = jest.spyOn(prisma.contactMessage, 'findMany')
  .mockRejectedValueOnce(new Error('synthetic read failure'));
const log = jest.spyOn(console, 'error').mockImplementation(() => {});
try {
  const response = await request(createApp()).get('/api/admin/messages')
    .set('Authorization', `Bearer ${token}`)
    .timeout({ response: 1000, deadline: 1500 });
  expect(response.status).toBe(500);
  expect(response.body).toEqual({ message: 'Internal server error' });
  expect(log).toHaveBeenCalledWith('API operation failed:', 'Error');
} finally {
  failure.mockRestore();
  log.mockRestore();
}
```

Use the existing `messageId` and `bookingId` for PATCH requests and send valid payloads, so validation cannot mask the handler failure.

- [ ] **Step 2: Run the regressions before implementation.**

```powershell
Set-Location backend
$env:DATABASE_URL='postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test'
$env:NODE_ENV='test'
npm test -- --runTestsByPath tests\admin.test.ts
```

Expected: new failure-response cases fail because rejected async route handlers do not forward to Express; existing successful writes still pass.

- [ ] **Step 3: Wrap only the three affected handlers.**

Each signature becomes `async (req, res, next)` (or `_req`); retain the existing Prisma operations and response and wrap them with:

```ts
adminRouter.patch('/bookings/:id/deposit', validate(depositSchema), async (req, res, next) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.id as string },
      data: { depositAmount: new Prisma.Decimal(depositSchema.parse(req.body).depositAmount) }
    });
    res.json({ depositAmount: booking.depositAmount.toString() });
  } catch (error) {
    next(error);
  }
});
```

Apply the same `try`/`catch` boundary around the existing message GET and PATCH operations, preserving their payloads. Do not wrap unrelated login/gallery/pricing routes.

- [ ] **Step 4: Repeat the same tests and verify success paths still persist data.**

Expected: admin suite passes, including log assertions and the subsequent message GET.

### Task 2: Deposit feedback and date-only ranges

**Files:** Modify `AdminBookings.tsx`, both i18n JSON files; create `AdminBookings.feedback.test.tsx`, all under `frontend\src`.

**Interfaces:**
- Consumes: `updateBookingDeposit(token: string, id: string, amount: number): Promise<{ depositAmount: string }>` and `AdminBookingRow`.
- Produces: unchanged API requests, status messages local to each booking, date-only ranges.

- [ ] **Step 1: Write isolated UI regressions.**

Use complete typed `AdminBookingRow` fixtures with a confirmed booking, `expiresAt: null`, a `NOT_APPLICABLE` confirmation view and a second independent row. Mock admin API with `vi.spyOn`, restore spies and clean rendered components after every test. Use controlled promises for mutations:

```ts
let resolveSave!: (value: { depositAmount: string }) => void;
const save = vi.spyOn(adminApi, 'updateBookingDeposit').mockReturnValueOnce(
  new Promise((resolve) => { resolveSave = resolve; })
);
fireEvent.change(input, { target: { value: '200' } });
fireEvent.click(within(input.parentElement!).getByRole('button', { name: 'Zapisz zaliczkę' }));
expect(screen.getByRole('button', { name: 'Zapisuję…' })).toBeDisabled();
expect(screen.queryByText('Zapisano')).not.toBeInTheDocument();
await act(async () => { resolveSave({ depositAmount: '200' }); });
expect(screen.getByRole('status')).toHaveTextContent('Zapisano');
expect(save).toHaveBeenCalledTimes(1);
```

Add fake-timer cases after initial real-timer loading: status remains at 2999 ms and disappears at 3000 ms; editing clears it; a later save gets its own full 3 seconds. Unmount clears timers, including when a pending request resolves afterward. Check a background focus refresh preserves current feedback and a second row remains usable. A rejected mutation retains the draft and shows an alert, not success. Unchanged values cannot start a request. Test negative/non-numeric drafts against existing validation.

For dates, return `2026-10-16T00:00:00.000Z` and `2026-10-18T00:00:00.000Z`; assert the row contains exactly `2026-10-16 – 2026-10-18`, not the original timestamp. Include an `expiresAt` case to ensure decision time remains visible. Test English saving/saved/error labels by switching i18n and restoring Polish.

- [ ] **Step 2: Run the new file and confirm the missing feedback fails.**

```powershell
Set-Location frontend
npm test -- src\pages\admin\AdminBookings.feedback.test.tsx
```

- [ ] **Step 3: Add per-row state and accessible output.**

Use this state shape inside `AdminBookings`, without changing the existing row model:

```ts
type DepositState = 'saving' | 'saved';
const [depositStates, setDepositStates] = useState<Record<string, DepositState>>({});
const depositTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
const mounted = useRef(false);
```

Set `mounted` in an effect; its cleanup sets false and clears all timers. Before a save, guard the row's saving state, keep existing validation and clear its previous timeout/error. Set `saving`, await the API, and ignore UI updates after unmount. On success update the row from the returned amount, remove its draft, set `saved`, and schedule removing that status after exactly 3000 ms. On failure retain the draft, clear saving and show a translated per-row error with `role="alert"`; handle expired auth consistently with the current panel.

Disable the row's input while saving and its button while saving or numerically unchanged. On editing clear the previous saved status and timeout. Use `role="status"` for successful output, not a success-shaped optimistic update. Other rows remain independent.

Use `booking.checkIn.slice(0, 10)` and `booking.checkOut.slice(0, 10)` separated by ` – `; keep the existing localized `expiresAt` time.

Add these translation keys under `admin.deposit`:

```json
{
  "label": "Zaliczka {{name}}",
  "save": "Zapisz zaliczkę",
  "saving": "Zapisuję…",
  "saved": "Zapisano",
  "invalid": "Zaliczka musi być liczbą nieujemną",
  "error": "Nie udało się zapisać zaliczki. Spróbuj ponownie."
}
```

English values respectively: `Deposit {{name}}`, `Save deposit`, `Saving…`, `Saved`, `Deposit must be a non-negative number`, `Could not save the deposit. Please try again.` Match existing JSON Unicode escaping.

- [ ] **Step 4: Run new and existing admin-booking tests together.**

```powershell
Set-Location frontend
npm test -- src\pages\admin\AdminBookings.feedback.test.tsx src\pages\admin\AdminTabs.test.tsx
```

### Task 3: Read/unread messages

**Files:** Modify `AdminMessages.tsx`, `types\index.ts`, `api\admin.ts`, both i18n JSON files; create `AdminMessages.test.tsx`, all under `frontend\src`.

**Interfaces:**
- Consumes: `getAdminMessages(token: string): Promise<AdminMessage[]>`, existing `markMessageRead(token: string, id: string): Promise<{ isRead: true }>`.
- Produces: `export type AdminMessage = ContactPayload & { id: string; isRead: boolean }`, typed API retrieval and two filtered views without data deletion.

- [ ] **Step 1: Write failing tests with one unread and one read message.**

Mock a controlled pending mark-read request and assert:

```ts
expect(await screen.findByRole('button', { name: 'Nieodczytane (1)' }))
  .toHaveAttribute('aria-pressed', 'true');
expect(screen.queryByText('Previously read body')).not.toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: 'Oznacz jako odczytaną' }));
expect(screen.getByText('Unread body')).toBeInTheDocument();
expect(screen.getByRole('button', { name: 'Oznaczanie…' })).toBeDisabled();
```

Resolve `{ isRead: true }`, then assert unread/read counts become 0/2, the default view is empty, the read view contains both messages, and no read action appears there. Remount with the GET mock returning the persisted read state. A rejected mutation retains the original item and both counters, displays an alert, and allows a second attempt.

Cover initial loading, a failed GET, empty categories, PL/EN labels, and overflow-safe long message text. After each test use `cleanup`, `vi.restoreAllMocks`, restore Polish and clear synthetic local storage.

- [ ] **Step 2: Run the new file before changing the view.**

```powershell
Set-Location frontend
npm test -- src\pages\admin\AdminMessages.test.tsx
```

Expected: missing filters, loading and mutation feedback fail.

- [ ] **Step 3: Implement typed retrieval and state-derived categories.**

Export `AdminMessage` next to `ContactPayload`; import it into the API and view; replace `apiClient<any[]>` with `apiClient<AdminMessage[]>`.

Keep all loaded messages in one array and derive both counts and the current list from `isRead`. Initialize `showRead` to false. Use filter buttons with `aria-pressed`, rather than incomplete ARIA tab semantics. Keep the existing newest-first server order. Track `loading`, load errors, pending mutation and per-message mutation errors separately. Ignore late initial-load results after unmount.

Await `markMessageRead` before mapping its returned `isRead` into the array. Disable repeated mutations while in flight; on rejection show a message error without changing the array. For HTTP 401 follow the existing token-removal/login-redirection behavior. The read category has no marking button. Long email/body text uses wrapping, and filters may wrap on mobile.

Under `admin.messageList`, add the following PL/EN pairs:

| Key | PL | EN |
|---|---|---|
| unread | Nieodczytane | Unread |
| read | Odczytane | Read |
| markRead | Oznacz jako odczytaną | Mark as read |
| marking | Oznaczanie… | Marking… |
| loading | Ładowanie wiadomości… | Loading messages… |
| emptyUnread | Brak nieodczytanych wiadomości. | No unread messages. |
| emptyRead | Brak odczytanych wiadomości. | No read messages. |
| loadError | Nie udało się pobrać wiadomości. Spróbuj odświeżyć stronę. | Could not load messages. Please refresh the page. |
| markError | Nie udało się oznaczyć wiadomości jako odczytanej. Spróbuj ponownie. | Could not mark the message as read. Please try again. |

- [ ] **Step 4: Run all changed admin UI tests in one runner.**

```powershell
Set-Location frontend
npm test -- src\pages\admin\AdminMessages.test.tsx src\pages\admin\AdminBookings.feedback.test.tsx src\pages\admin\AdminTabs.test.tsx src\pages\admin\AdminCalendar.test.tsx src\pages\admin\AdminLayout.test.tsx
```

### Final integration gate

- [ ] Run backend admin/lifecycle/legacy-block regressions together using the isolated DB:

```powershell
Set-Location backend
$env:DATABASE_URL='postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test'
$env:NODE_ENV='test'
npm test -- --runTestsByPath tests\admin.test.ts tests\bookingLifecycle.test.ts tests\legacyBlocks.test.ts
```

- [ ] Build each changed package using its existing `npm run build`; inspect generated tracked-file changes and restore only generated artifacts that were clean before this work.
- [ ] Check the two changed views in the browser with synthetic fixture data and no real login/customer data, including a 320 px viewport. Confirm no document overflow, no success before the API response, and no console errors introduced by these views. Stop any temporary server by its known session/PID.
- [ ] Review the final diff directly against all nine acceptance criteria; no subagents. Do not remove production blocks or publish anything. Update this plan with actual completion and any known baseline failures; leave mixed implementation uncommitted for the coherent release.
