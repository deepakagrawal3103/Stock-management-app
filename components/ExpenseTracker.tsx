
import React, { useState, useEffect, useMemo } from 'react';
import { Expense } from '../types';
import { getExpenses, saveExpenses } from '../services/storage';
import { Card, Button, Input } from './ui/Common';
import { Plus, TrendingDown, Calendar, Receipt, Trash2, ArrowDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ExpenseTracker: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  useEffect(() => {
    setExpenses(getExpenses());
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      amount: parseFloat(amount),
      description: description,
      date: new Date().toISOString()
    };

    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    saveExpenses(updated);
    
    setAmount('');
    setDescription('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this expense record?')) {
      const updated = expenses.filter(e => e.id !== id);
      setExpenses(updated);
      saveExpenses(updated);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let dailyTotal = 0;
    let monthlyTotal = 0;

    expenses.forEach(e => {
      const d = new Date(e.date);
      if (d >= startOfDay) dailyTotal += e.amount;
      if (d >= startOfMonth) monthlyTotal += e.amount;
    });

    return { dailyTotal, monthlyTotal };
  }, [expenses]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5 border-l-4 border-orange-500 bg-gradient-to-br from-white to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-orange-100 text-orange-600 rounded-xl shadow-sm">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">Today's Expense</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.dailyTotal.toFixed(0)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-red-500 bg-gradient-to-br from-white to-red-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-red-100 text-red-600 rounded-xl shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Month Total</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.monthlyTotal.toFixed(0)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Form */}
      <Card className="p-5 shadow-soft border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand-500" /> Add New Expense
        </h3>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <Input 
              label="Description (e.g. A4 Paper Bundle)" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="What did you buy?"
              required
            />
          </div>
          <div className="w-full sm:w-32">
            <Input 
              label="Amount (₹)" 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0.00"
              required
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto h-[42px] mb-3 shadow-lg shadow-brand-500/20">
            Add
          </Button>
        </form>
      </Card>

      {/* Expense List */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 ml-1 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-gray-400" /> Recent History
        </h3>
        
        {expenses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
            <p className="text-sm">No expenses recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/50 text-xs font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {expenses.map((expense) => (
                      <motion.tr 
                        key={expense.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(expense.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {expense.description}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">
                          -₹{expense.amount.toFixed(0)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => handleDelete(expense.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
