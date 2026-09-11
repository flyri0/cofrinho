// see technical-specification.md §8.4
export interface NetWorthAccount {
  /** Cents. Already negative for outstanding credit/loan balances. */
  balance: number;
}

export function calculateNetWorth(accounts: NetWorthAccount[]): number {
  return accounts.reduce((total, account) => total + account.balance, 0);
}
