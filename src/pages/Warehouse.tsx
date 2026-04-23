import React, { useEffect, useState } from 'react';
import { Plus, Search, ScanLine, Edit2, Trash2 } from 'lucide-react';
import { productsDB } from '../lib/db';
import { Product, Unit } from '../types';
import { useStore } from '../store/useStore';
import { t } from '../locales/translations';
import { BarcodeScanner } from '../components/BarcodeScanner';

export const Warehouse = () => {
  const { language, currency, currentUser } = useStore();
  const lang = t[language];

  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState<'search' | 'form' | false>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    unit: 'шт' as Unit,
    purchasePrice: 0,
    sellingPrice: 0,
    incoming: 0,
  });

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      barcode: product.barcode || '',
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice || 0,
      incoming: 0, // When editing, we might just want to add more incoming or just edit details
    });
    setIsModalOpen(true);
  };

  const loadData = async () => {
    const data = await productsDB.getAll();
    setProducts(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const product = products.find(p => p.id === editingId);
      if (product) {
        await productsDB.update(editingId, {
          name: formData.name,
          barcode: formData.barcode,
          unit: formData.unit,
          purchasePrice: formData.purchasePrice,
          sellingPrice: formData.sellingPrice,
          quantity: product.quantity + formData.incoming,
          incoming: product.incoming + formData.incoming,
        });
      }
    } else {
      await productsDB.add({
        name: formData.name,
        barcode: formData.barcode,
        unit: formData.unit,
        purchasePrice: formData.purchasePrice,
        sellingPrice: formData.sellingPrice,
        quantity: formData.incoming, // Initial quantity is incoming
        incoming: formData.incoming,
        outgoing: 0,
        createdAt: Date.now()
      });
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', barcode: '', unit: 'шт', purchasePrice: 0, sellingPrice: 0, incoming: 0 });
    loadData();
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const totalStockValue = products.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0);

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang.warehouse}</h1>
          <p className="text-gray-500 mt-1">{lang.totalStockValue}: <span className="font-bold text-indigo-600">{totalStockValue.toFixed(2)} {currency}</span></p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsScannerOpen('search')}
            className="flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex-1 md:flex-none"
          >
            <ScanLine className="w-5 h-5" />
            <span className="hidden sm:inline">{lang.scanBarcode}</span>
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ name: '', barcode: '', unit: 'шт', purchasePrice: 0, sellingPrice: 0, incoming: 0 });
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex-1 md:flex-none"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{lang.addProduct}</span>
          </button>
        </div>
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
                <th className="p-4 font-medium">{lang.productName}</th>
                <th className="p-4 font-medium">{lang.barcode}</th>
                <th className="p-4 font-medium">{lang.unit}</th>
                <th className="p-4 font-medium">{lang.costPrice}</th>
                {currentUser?.role === 'admin' && (
                  <th className="p-4 font-medium">{lang.sellingPrice}</th>
                )}
                <th className="p-4 font-medium">{lang.incoming}</th>
                <th className="p-4 font-medium">{lang.outgoing}</th>
                <th className="p-4 font-medium">{lang.remainingStock}</th>
                <th className="p-4 font-medium">{lang.totalAmount}</th>
                <th className="p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map(product => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{product.name}</td>
                  <td className="p-4 text-gray-500">{product.barcode || '-'}</td>
                  <td className="p-4 text-gray-600">{product.unit}</td>
                  <td className="p-4 text-gray-600">{product.purchasePrice.toFixed(2)} {currency}</td>
                  {currentUser?.role === 'admin' && (
                    <td className="p-4 text-indigo-600 font-medium">{(product.sellingPrice || 0).toFixed(2)} {currency}</td>
                  )}
                  <td className="p-4 text-green-600">+{product.incoming}</td>
                  <td className="p-4 text-red-600">-{product.outgoing}</td>
                  <td className="p-4 font-bold text-gray-900">{product.quantity}</td>
                  <td className="p-4 font-medium text-indigo-600">{(product.quantity * product.purchasePrice).toFixed(2)} {currency}</td>
                  <td className="p-4">
                    <button onClick={() => handleEdit(product)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    {lang.noProducts}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Layout */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.map(product => (
            <div key={product.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-900">{product.name}</h3>
                  {product.barcode && <p className="text-xs text-gray-500">{product.barcode}</p>}
                </div>
                <span className="font-bold text-indigo-600">{(product.quantity * product.purchasePrice).toFixed(2)} {currency}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">{lang.costPrice}: <span className="font-medium text-gray-900">{product.purchasePrice.toFixed(2)} {currency}</span></div>
                {currentUser?.role === 'admin' && (
                  <div className="text-gray-600 text-right">{lang.sellingPrice}: <span className="font-medium text-indigo-600">{(product.sellingPrice || 0).toFixed(2)} {currency}</span></div>
                )}
                <div className={`text-gray-600 ${currentUser?.role !== 'admin' ? 'text-right' : ''}`}>{lang.remainingStock}: <span className="font-bold text-gray-900">{product.quantity} {product.unit}</span></div>
                <div className={`text-green-600 text-xs ${currentUser?.role === 'admin' ? 'text-right' : ''}`}>+{product.incoming} {lang.incoming}</div>
                <div className={`text-red-600 text-xs ${currentUser?.role !== 'admin' ? 'text-right' : ''}`}>-{product.outgoing} {lang.outgoing}</div>
              </div>
              <div className="mt-3 flex justify-end">
                <button onClick={() => handleEdit(product)} className="flex items-center space-x-1 text-sm text-indigo-600 font-medium">
                  <Edit2 className="w-4 h-4" />
                  <span>Изменить</span>
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {lang.noProducts}
            </div>
          )}
        </div>
      </div>

      {isScannerOpen && (
        <BarcodeScanner 
          onScan={(text) => {
            if (isScannerOpen === 'search') {
              setSearchTerm(text);
            } else {
              setFormData({ ...formData, barcode: text });
            }
            setIsScannerOpen(false);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Редактировать товар' : lang.addProduct}</h2>
            </div>
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang.productName} *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang.barcode}</label>
                  <div className="flex space-x-2">
                    <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <button type="button" onClick={() => setIsScannerOpen('form')} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
                      <ScanLine className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang.unit} *</label>
                  <select required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as Unit})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="шт">шт</option>
                    <option value="м">м</option>
                    <option value="кг">кг</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang.costPrice} *</label>
                  <input required type="number" step="0.01" min="0" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: parseFloat(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                {currentUser?.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{lang.sellingPrice} *</label>
                    <input required type="number" step="0.01" min="0" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: parseFloat(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{editingId ? 'Добавить приход (опционально)' : lang.incoming + ' *'}</label>
                  <input required={!editingId} type="number" min="0" step="0.01" value={formData.incoming} onChange={e => setFormData({...formData, incoming: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">{lang.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">{lang.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
