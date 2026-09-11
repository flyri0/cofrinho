import { formatDateTime } from '../formatDateTime';

describe('formatDateTime', () => {
  it('formats a date and time for en', () => {
    const result = formatDateTime(new Date('2026-05-10T14:30:00Z'), 'en');
    expect(result).toEqual(
      new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date('2026-05-10T14:30:00Z'),
      ),
    );
  });

  it('formats a date and time for pt-BR', () => {
    const date = new Date('2026-05-10T14:30:00Z');
    const result = formatDateTime(date, 'pt-BR');
    expect(result).toEqual(
      new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date),
    );
  });
});
