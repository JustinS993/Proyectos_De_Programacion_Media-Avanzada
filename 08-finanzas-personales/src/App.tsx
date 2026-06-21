import React from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';

const App: React.FC = () => {
  const { totalIncome, totalExpenses, balance } = useFinance();

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
            💰 Control de Finanzas Personales
          </h1>
        </header>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-bg-secondary rounded-xl p-6 shadow-lg border border-slate-700 text-center">
            <p className="text-text-secondary text-sm font-medium">Ingresos Totales</p>
            <p className="text-3xl font-bold text-accent-green mt-2">${totalIncome.toFixed(2)}</p>
          </div>
          <div className="bg-bg-secondary rounded-xl p-6 shadow-lg border border-slate-700 text-center">
            <p className="text-text-secondary text-sm font-medium">Gastos Totales</p>
            <p className="text-3xl font-bold text-accent-red mt-2">${totalExpenses.toFixed(2)}</p>
          </div>
          <div className="bg-bg-secondary rounded-xl p-6 shadow-lg border border-slate-700 text-center">
            <p className="text-text-secondary text-sm font-medium">Balance</p>
            <p className={`text-3xl font-bold mt-2 ${balance >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              ${balance.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <TransactionForm />
          </div>
          <div className="md:col-span-2">
            <TransactionList />
          </div>
        </div>
      </div>
    </div>
  );
};

const WrappedApp = () => (
  <FinanceProvider>
    <App />
  </FinanceProvider>
);

export default WrappedApp;
