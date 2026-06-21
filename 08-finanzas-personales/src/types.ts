export interface Transaction {
  id: string;
  type: 'income' | 'expense';
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
