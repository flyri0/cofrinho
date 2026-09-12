import type { ThemeMode } from '@/db/schema';

// see technical-specification.md §6.1 — "Mode: Light / Dark / Follow system".
// 'system' defers to the OS-reported scheme; an unknown/undefined OS scheme
// (can happen briefly on some platforms) falls back to 'light'.
export function resolveScheme(
  mode: ThemeMode,
  systemScheme: 'light' | 'dark' | null | undefined,
): 'light' | 'dark' {
  if (mode === 'system') return systemScheme ?? 'light';
  return mode;
}
