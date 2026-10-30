export function assertTestDatabaseUrl(value: string | undefined): void {
  const message = 'Tests require isolated localhost:55432/lagom_test';
  if (!value || !URL.canParse(value)) throw new Error(message);
  const url = new URL(value);
  if (
    !['postgresql:', 'postgres:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== '55432' ||
    url.pathname !== '/lagom_test' ||
    (url.search !== '' && url.search !== '?schema=public') ||
    url.hash !== ''
  ) {
    throw new Error(message);
  }
}
