export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  date: string;
}

export interface Category {
  name: string;
  color: string;
  icon: string;
}
