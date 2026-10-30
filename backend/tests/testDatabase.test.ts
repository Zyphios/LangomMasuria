import { assertTestDatabaseUrl } from './testDatabase';

describe('isolated test database guard', () => {
  it.each([
    'postgresql://lagom_test:lagom_test@127.0.0.1:55432/lagom_test',
    'postgresql://lagom_test:lagom_test@localhost:55432/lagom_test?schema=public'
  ])('allows the dedicated local database: %s', (url) => {
    expect(() => assertTestDatabaseUrl(url)).not.toThrow();
  });

  it.each([
    undefined,
    '',
    'invalid',
    'postgresql://test:secret@remote.example:55432/lagom_test',
    'postgresql://test:secret@127.0.0.1:5432/lagom_test',
    'postgresql://test:secret@127.0.0.1:55432/lagom',
    'postgresql://test:secret@127.0.0.1:55432/lagom_test_other',
    'postgresql://test:secret@localhost/lagom_test',
    'https://localhost:55432/lagom_test',
    'postgresql://test:secret@localhost:55432/lagom_test?host=remote.example'
  ])('rejects unsafe connection configuration without exposing credentials (case %#)', (url) => {
    expect(() => assertTestDatabaseUrl(url)).toThrow('Tests require isolated localhost:55432/lagom_test');
  });
});
