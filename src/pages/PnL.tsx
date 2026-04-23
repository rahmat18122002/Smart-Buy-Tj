import React, { useEffect, useState } from 'react';
import { salesDB, expensesDB, customerDebtsDB } from '../lib/db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, differenceInDays } from 'date-fns';
import { useStore } from '../store/useStore';
import { t } from '../locales/translations';

export const PnL = () => {
  const { language, currency } = useStore();
  const lang = t[language];

  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const [summary, setSummary] = useState({
    totalSales: 0,
    paidAmount: 0,
    outstandingDebt: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    cash: 0
  });

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const allSales = await salesDB.getAll();
      const allExpenses = await expensesDB.getAll();
      const allDebts = await customerDebtsDB.getAll();

      const start = startOfDay(new Date(dateRange.start));
      const end = endOfDay(new Date(dateRange.end));

      const sales = allSales.filter(s => isWithinInterval(s.date, { start, end }));
      const expenses = allExpenses.filter(e => isWithinInterval(e.date, { start, end }));
      const customerDebts = allDebts.filter(d => isWithinInterval(d.date, { start, end }));

      let totalSales = 0;
      let totalCost = 0;
      let paidAmount = 0;

      sales.forEach(sale => {
        totalSales += sale.totalAmount;
        totalCost += sale.costPrice * sale.quantity;
        paidAmount += sale.paidAmount;
      });

      customerDebts.forEach(debt => {
        paidAmount += debt.paid;
      });

      const outstandingDebt = customerDebts.reduce((sum, d) => sum + d.remaining, 0);
      const grossProfit = totalSales - totalCost;
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = grossProfit - totalExpenses;
      const cash = paidAmount - totalExpenses;

      setSummary({
        totalSales,
        paidAmount,
        outstandingDebt,
        grossProfit,
        totalExpenses,
        netProfit,
        cash
      });

      // Determine grouping based on date range difference
      const diffDays = differenceInDays(end, start);
      const groupByMonth = diffDays > 31;

      // Generate real chart data grouped by day or month
      const timeMap = new Map<string, { income: number, expense: number }>();
      
      // Initialize map with all intervals in range to ensure empty periods are shown
      let currentDate = new Date(start);
      while (currentDate <= end) {
        const key = groupByMonth ? format(currentDate, 'MMM yyyy') : format(currentDate, 'MMM dd');
        if (!timeMap.has(key)) {
          timeMap.set(key, { income: 0, expense: 0 });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      sales.forEach(sale => {
        const key = groupByMonth ? format(sale.date, 'MMM yyyy') : format(sale.date, 'MMM dd');
        if (timeMap.has(key)) {
          timeMap.get(key)!.income += sale.totalAmount;
        }
      });

      expenses.forEach(expense => {
        const key = groupByMonth ? format(expense.date, 'MMM yyyy') : format(expense.date, 'MMM dd');
        if (timeMap.has(key)) {
          timeMap.get(key)!.expense += expense.amount;
        }
      });

      const newChartData = Array.from(timeMap.entries()).map(([name, data]) => ({
        name,
        income: data.income,
        expense: data.expense
      }));

      setChartData(newChartData);
    };

    loadData();
  }, [dateRange]);

  const setPresetRange = (days: number) => {
    setDateRange({
      start: format(subDays(new Date(), days), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    });
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{lang.pnl}</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <div className="flex space-x-2 w-full sm:w-auto">
            <button onClick={() => setPresetRange(7)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex-1 sm:flex-none">7 дней</button>
            <button onClick={() => setPresetRange(30)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex-1 sm:flex-none">30 дней</button>
            <button onClick={() => setPresetRange(365)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex-1 sm:flex-none">1 год</button>
          </div>
          <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100 w-full sm:w-auto">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-2 py-1 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
            />
            <span className="text-gray-500">-</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-2 py-1 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Income Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">{lang.income}</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">{lang.totalSales}</span>
              <span className="font-bold text-gray-900">{summary.totalSales.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{lang.paidAmount}</span>
              <span className="font-bold text-green-600">{summary.paidAmount.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{lang.outstandingDebt}</span>
              <span className="font-bold text-orange-600">{summary.outstandingDebt.toFixed(2)} {currency}</span>
            </div>
          </div>
        </div>

        {/* Profit Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">{lang.profit}</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">{lang.grossProfit}</span>
              <span className="font-bold text-gray-900">{summary.grossProfit.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{lang.totalExpenses}</span>
              <span className="font-bold text-red-600">-{summary.totalExpenses.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-bold text-gray-900">{lang.netProfit}</span>
              <span className={`font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.netProfit.toFixed(2)} {currency}
              </span>
            </div>
          </div>
        </div>

        {/* Cash Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 bg-indigo-50 border-indigo-100">
          <h2 className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-200 pb-2">{lang.cash}</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-indigo-700">{lang.moneyReceived}</span>
              <span className="font-medium text-indigo-900">{summary.paidAmount.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-700">{lang.moneySpent}</span>
              <span className="font-medium text-indigo-900">-{summary.totalExpenses.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-indigo-200">
              <span className="font-bold text-indigo-900 text-lg">{lang.currentCash}</span>
              <span className={`font-bold text-lg ${summary.cash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.cash.toFixed(2)} {currency}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-6">{lang.incomeVsExpenses}</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f3f4f6'}} />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name={lang.income} />
              <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name={lang.expenses} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
