import { resolveScheme } from '../resolveScheme';

describe('resolveScheme', () => {
  it('follows the OS scheme when mode is system', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('falls back to light when mode is system and the OS scheme is unknown', () => {
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });

  it('forces light regardless of the OS scheme', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
  });

  it('forces dark regardless of the OS scheme', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});
