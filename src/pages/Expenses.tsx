import React, { useEffect, useState } from 'react';
import { Plus, Search, Calendar, Trash2 } from 'lucide-react';
import { expensesDB } from '../lib/db';
import { Expense, ExpenseCategory } from '../types';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';
import { t } from '../locales/translations';

export const Expenses = () => {
  const { language, currency, currentUser } = useStore();
  const lang = t[language];

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    amount: 0, 
    category: 'Магазин' as ExpenseCategory, 
    date: Date.now() 
  });

  const loadData = async () => {
    const data = await expensesDB.getAll();
    setExpenses(data.sort((a, b) => b.date - a.date));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await expensesDB.add({ ...formData });
    setIsModalOpen(false);
    setFormData({ name: '', amount: 0, category: 'Магазин', date: Date.now() });
    loadData();
  };

  const filtered = expenses.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalMonthly = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const getCategoryLabel = (cat: ExpenseCategory) => {
    switch(cat) {
      case 'Магазин': return lang.catShop;
      case 'Налог и госпошлины': return lang.catTaxes;
      case 'Зарплата': return lang.catSalary;
      case 'Дополнительные': return lang.catAdditional;
      default: return cat;
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{lang.expenses}</h1>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex-1 md:flex-none"
          >
            <Plus className="w-5 h-5" />
            <span>{lang.addExpense}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
          <p className="text-sm font-medium text-red-600 mb-1">{lang.totalThisMonth}</p>
          <h3 className="text-2xl font-bold text-red-700">{totalMonthly.toFixed(2)} {currency}</h3>
        </div>
        {(['Магазин', 'Налог и госпошлины', 'Зарплата', 'Дополнительные'] as ExpenseCategory[]).map(cat => (
          <div key={cat} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-sm font-medium text-gray-500 mb-1 truncate">{getCategoryLabel(cat)}</p>
            <h3 className="text-xl font-bold text-gray-900">{(categoryTotals[cat] || 0).toFixed(2)} {currency}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text"
              placeholder={lang.search}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                <th className="p-4 font-medium">{lang.date}</th>
                <th className="p-4 font-medium">{lang.expenseName}</th>
                <th className="p-4 font-medium">{lang.category}</th>
                <th className="p-4 font-medium text-right">{lang.amount}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map(expense => (
                <tr key={expense.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {format(expense.date, 'MMM dd, yyyy')}
                    </div>
                  </td>
                  <td className="p-4 font-medium text-gray-900">{expense.name}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {getCategoryLabel(expense.category)}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-red-600">
                    {expense.amount.toFixed(2)} {currency}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    {lang.noExpenses}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Layout */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.map(expense => (
            <div key={expense.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-900">{expense.name}</h3>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(expense.date, 'MMM dd, yyyy')}
                  </div>
                </div>
                <span className="font-bold text-red-600">{expense.amount.toFixed(2)} {currency}</span>
              </div>
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-2">
                {getCategoryLabel(expense.category)}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {lang.noExpenses}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{lang.addExpense}</h2>
            </div>
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang.expenseName} *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang.amount} ({currency}) *</label>
                  <input required type="number" step="0.01" min="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang.category} *</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as ExpenseCategory})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="Магазин">{lang.catShop}</option>
                    <option value="Налог и госпошлины">{lang.catTaxes}</option>
                    <option value="Зарплата">{lang.catSalary}</option>
                    <option value="Дополнительные">{lang.catAdditional}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">{lang.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">{lang.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
