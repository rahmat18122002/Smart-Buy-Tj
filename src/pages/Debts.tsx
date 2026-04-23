import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { customerDebtsDB, supplierDebtsDB } from '../lib/db';
import { CustomerDebt, SupplierDebt } from '../types';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';
import { t } from '../locales/translations';

export const Debts = () => {
  const { language, currency, currentUser } = useStore();
  const lang = t[language];

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [customerDebts, setCustomerDebts] = useState<CustomerDebt[]>([]);
  const [supplierDebts, setSupplierDebts] = useState<SupplierDebt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({
    supplierName: '',
    amount: 0,
    comment: ''
  });

  const [paymentModal, setPaymentModal] = useState<{type: 'customer' | 'supplier', id: string, remaining: number} | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  const loadData = async () => {
    const cData = await customerDebtsDB.getAll();
    const sData = await supplierDebtsDB.getAll();
    setCustomerDebts(cData.filter(d => d.remaining > 0).sort((a, b) => b.date - a.date));
    setSupplierDebts(sData.filter(d => d.remaining > 0).sort((a, b) => b.date - a.date));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSupplierDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    await supplierDebtsDB.add({
      date: Date.now(),
      supplierName: supplierFormData.supplierName,
      amount: supplierFormData.amount,
      paid: 0,
      remaining: supplierFormData.amount,
      comment: supplierFormData.comment
    });
    setIsSupplierModalOpen(false);
    setSupplierFormData({ supplierName: '', amount: 0, comment: '' });
    loadData();
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;

    if (paymentModal.type === 'customer') {
      const debt = await customerDebtsDB.getById(paymentModal.id);
      if (debt) {
        await customerDebtsDB.update(debt.id, {
          paid: debt.paid + paymentAmount,
          remaining: debt.remaining - paymentAmount
        });
      }
    } else {
      const debt = await supplierDebtsDB.getById(paymentModal.id);
      if (debt) {
        await supplierDebtsDB.update(debt.id, {
          paid: debt.paid + paymentAmount,
          remaining: debt.remaining - paymentAmount
        });
      }
    }

    setPaymentModal(null);
    setPaymentAmount(0);
    loadData();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{lang.debts}</h1>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {activeTab === 'suppliers' && (
            <button 
              onClick={() => setIsSupplierModalOpen(true)}
              className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex-1 md:flex-none"
            >
              <Plus className="w-5 h-5" />
              <span>{lang.addSupplierDebt}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <button 
          onClick={() => setActiveTab('customers')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'customers' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
        >
          {lang.customersOwe}
        </button>
        <button 
          onClick={() => setActiveTab('suppliers')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
        >
          {lang.weOwe}
        </button>
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
          {activeTab === 'customers' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                  <th className="p-4 font-medium">{lang.date}</th>
                  <th className="p-4 font-medium">{lang.customerName}</th>
                  <th className="p-4 font-medium">{lang.productName}</th>
                  <th className="p-4 font-medium">{lang.totalDebt}</th>
                  <th className="p-4 font-medium">{lang.paid}</th>
                  <th className="p-4 font-medium text-red-600">{lang.remaining}</th>
                  <th className="p-4 font-medium text-right">{lang.action}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {customerDebts.filter(d => d.customerName.toLowerCase().includes(searchTerm.toLowerCase())).map(debt => (
                  <tr key={debt.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4 text-gray-600">{format(debt.date, 'MMM dd, yyyy')}</td>
                    <td className="p-4 font-medium text-gray-900">{debt.customerName}</td>
                    <td className="p-4 text-gray-600">{debt.productName}</td>
                    <td className="p-4 text-gray-900">{debt.debtAmount.toFixed(2)} {currency}</td>
                    <td className="p-4 text-green-600">{debt.paid.toFixed(2)} {currency}</td>
                    <td className="p-4 font-bold text-red-600">{debt.remaining.toFixed(2)} {currency}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setPaymentModal({type: 'customer', id: debt.id, remaining: debt.remaining})}
                        className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        {lang.addPayment}
                      </button>
                    </td>
                  </tr>
                ))}
                {customerDebts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">{lang.noCustomerDebts}</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                  <th className="p-4 font-medium">{lang.date}</th>
                  <th className="p-4 font-medium">{lang.supplierName}</th>
                  <th className="p-4 font-medium">{lang.comment}</th>
                  <th className="p-4 font-medium">{lang.totalAmount}</th>
                  <th className="p-4 font-medium">{lang.paid}</th>
                  <th className="p-4 font-medium text-red-600">{lang.remaining}</th>
                  <th className="p-4 font-medium text-right">{lang.action}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {supplierDebts.filter(d => d.supplierName.toLowerCase().includes(searchTerm.toLowerCase())).map(debt => (
                  <tr key={debt.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4 text-gray-600">{format(debt.date, 'MMM dd, yyyy')}</td>
                    <td className="p-4 font-medium text-gray-900">{debt.supplierName}</td>
                    <td className="p-4 text-gray-600">{debt.comment}</td>
                    <td className="p-4 text-gray-900">{debt.amount.toFixed(2)} {currency}</td>
                    <td className="p-4 text-green-600">{debt.paid.toFixed(2)} {currency}</td>
                    <td className="p-4 font-bold text-red-600">{debt.remaining.toFixed(2)} {currency}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setPaymentModal({type: 'supplier', id: debt.id, remaining: debt.remaining})}
                        className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        {lang.addPayment}
                      </button>
                    </td>
                  </tr>
                ))}
                {supplierDebts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">{lang.noSupplierDebts}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Cards Layout */}
        <div className="md:hidden divide-y divide-gray-100">
          {activeTab === 'customers' ? (
            <>
              {customerDebts.filter(d => d.customerName.toLowerCase().includes(searchTerm.toLowerCase())).map(debt => (
                <div key={debt.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{debt.customerName}</h3>
                      <p className="text-xs text-gray-500">{format(debt.date, 'MMM dd, yyyy')} • {debt.productName}</p>
                    </div>
                    <span className="font-bold text-red-600">{debt.remaining.toFixed(2)} {currency}</span>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm">
                      <span className="text-gray-500">{lang.paid}: </span>
                      <span className="font-medium text-green-600">{debt.paid.toFixed(2)} {currency}</span>
                    </div>
                    <button 
                      onClick={() => setPaymentModal({type: 'customer', id: debt.id, remaining: debt.remaining})}
                      className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      {lang.addPayment}
                    </button>
                  </div>
                </div>
              ))}
              {customerDebts.length === 0 && (
                <div className="p-8 text-center text-gray-500">{lang.noCustomerDebts}</div>
              )}
            </>
          ) : (
            <>
              {supplierDebts.filter(d => d.supplierName.toLowerCase().includes(searchTerm.toLowerCase())).map(debt => (
                <div key={debt.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{debt.supplierName}</h3>
                      <p className="text-xs text-gray-500">{format(debt.date, 'MMM dd, yyyy')}</p>
                      {debt.comment && <p className="text-sm text-gray-600 mt-1">{debt.comment}</p>}
                    </div>
                    <span className="font-bold text-red-600">{debt.remaining.toFixed(2)} {currency}</span>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm">
                      <span className="text-gray-500">{lang.paid}: </span>
                      <span className="font-medium text-green-600">{debt.paid.toFixed(2)} {currency}</span>
                    </div>
                    <button 
                      onClick={() => setPaymentModal({type: 'supplier', id: debt.id, remaining: debt.remaining})}
                      className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      {lang.addPayment}
                    </button>
                  </div>
                </div>
              ))}
              {supplierDebts.length === 0 && (
                <div className="p-8 text-center text-gray-500">{lang.noSupplierDebts}</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Supplier Debt Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{lang.addSupplierDebt}</h2>
            </div>
            <form onSubmit={handleAddSupplierDebt} className="p-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang.supplierName} *</label>
                  <input required type="text" value={supplierFormData.supplierName} onChange={e => setSupplierFormData({...supplierFormData, supplierName: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang.amount} ({currency}) *</label>
                  <input required type="number" step="0.01" min="0.01" value={supplierFormData.amount} onChange={e => setSupplierFormData({...supplierFormData, amount: parseFloat(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang.comment}</label>
                  <input type="text" value={supplierFormData.comment} onChange={e => setSupplierFormData({...supplierFormData, comment: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">{lang.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">{lang.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{lang.recordPayment}</h2>
              <p className="text-sm text-gray-500 mt-1">{lang.remaining}: {paymentModal.remaining.toFixed(2)} {currency}</p>
            </div>
            <form onSubmit={handlePayment} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">{lang.amount} ({currency}) *</label>
                <input required type="number" step="0.01" min="0.01" max={paymentModal.remaining} value={paymentAmount} onChange={e => setPaymentAmount(parseFloat(e.target.value))} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setPaymentModal(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">{lang.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">{lang.confirmPayment}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
