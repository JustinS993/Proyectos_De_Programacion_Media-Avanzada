import React from 'react';
import { useFinance } from '../context/FinanceContext';

const TransactionList: React.FC = () => {
  const { transactions, deleteTransaction } = useFinance();

  return (
    <div className="bg-bg-secondary rounded-xl p-6 shadow-lg border border-slate-700">
      <h3 className="text-xl font-bold mb-4">Historial de Transacciones</h3>
      {transactions.length === 0 ? (
        <p className="text-center text-text-secondary">No hay transacciones</p>
      ) : (
        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
          {transactions.map((t) => (
            <div
              key={t.id}
              className="bg-bg-primary rounded-lg p-4 flex justify-between items-center border border-slate-700 hover:border-slate-500 transition-colors"
            >
              <div>
                <p className="font-semibold">{t.description}</p>
                <div className="flex gap-2 items-center text-sm text-text-secondary">
                  <span className="bg-slate-700 px-2 py-0.5 rounded-full text-xs">
                    {t.category}
                  </span>
                  <span>{new Date(t.date).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className={`font-bold ${t.type === 'income' ? 'text-accent-green' : 'text-accent-red'}`}>
                  {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                </p>
                <button
                  onClick={() => deleteTransaction(t.id)}
                  className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionList;
