import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';

const categories = ['Salario', 'Freelance', 'Comida', 'Transporte', 'Entretenimiento', 'Salud', 'Ropa', 'Otros'];

const TransactionForm: React.FC = () => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Otros');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const { addTransaction } = useFinance();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    addTransaction({
      type,
      description,
      amount: Number(amount),
      category,
      date,
    });
    setDescription('');
    setAmount('');
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-6 shadow-lg border border-slate-700">
      <h3 className="text-xl font-bold mb-4">Agregar Transacción</h3>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setType('income')}
          className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
            type === 'income' ? 'bg-accent-green text-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Ingreso
        </button>
        <button
          onClick={() => setType('expense')}
          className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
            type === 'expense' ? 'bg-accent-red text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Gasto
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-bg-primary border border-slate-700 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-green"
            placeholder="Ej: Mercado, Pago de renta..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Monto</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-bg-primary border border-slate-700 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-green"
            placeholder="0.00"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Categoría</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-bg-primary border border-slate-700 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-green"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-bg-primary border border-slate-700 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-green"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg"
        >
          Agregar Transacción
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
