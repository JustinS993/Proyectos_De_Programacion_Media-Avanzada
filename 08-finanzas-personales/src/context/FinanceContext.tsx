import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  date: string;
}

interface FinanceContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('finance-transactions');
    if (saved) return JSON.parse(saved);
    return [
      { id: crypto.randomUUID(), type: 'income', category: 'Salario', description: 'Pago mensual', amount: 3000, date: new Date().toISOString().split('T')[0] },
      { id: crypto.randomUUID(), type: 'expense', category: 'Comida', description: 'Mercado', amount: 150, date: new Date().toISOString().split('T')[0] },
      { id: crypto.randomUUID(), type: 'expense', category: 'Transporte', description: 'Gasolina', amount: 40, date: new Date().toISOString().split('T')[0] },
      { id: crypto.randomUUID(), type: 'income', category: 'Freelance', description: 'Proyecto web', amount: 500, date: new Date().toISOString().split('T')[0] },
      { id: crypto.randomUUID(), type: 'expense', category: 'Entretenimiento', description: 'Cine y comida', amount: 30, date: new Date().toISOString().split('T')[0] },
    ];
  });

  useEffect(() => {
    localStorage.setItem('finance-transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...transaction, id: crypto.randomUUID() };
    setTransactions([newTransaction, ...transactions]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalIncome - totalExpenses;

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        addTransaction,
        deleteTransaction,
        totalIncome,
        totalExpenses,
        balance,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
