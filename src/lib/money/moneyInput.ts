// "Calculator style" money input: the digits the user has typed, read right-to-left,
// *are* the cents (e.g. typing 1,5,0,0,0 progressively means R$150,00). This sidesteps
// decimal-separator ambiguity (comma vs dot) entirely — there's nothing to parse.
export function digitsToCents(rawDigits: string): number {
  const cleaned = rawDigits.replace(/\D/g, '');
  if (cleaned === '') return 0;
  return parseInt(cleaned, 10);
}
