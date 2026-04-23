import React, { useEffect, useState } from 'react';
import { Plus, Search, ScanLine, Trash2, ShoppingCart } from 'lucide-react';
import { productsDB, salesDB, customerDebtsDB } from '../lib/db';
import { Product, Sale, CartItem } from '../types';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { t } from '../locales/translations';
import { BarcodeScanner } from '../components/BarcodeScanner';

export const Sales = () => {
  const { language, currency, currentUser } = useStore();
  const lang = t[language];

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');

  const loadData = async () => {
    const pData = await productsDB.getAll();
    const sData = await salesDB.getAll();
    setProducts(pData);
    setSales(sData.sort((a, b) => b.date - a.date));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteSale = async (saleId: string) => {
    if (currentUser?.role !== 'admin') return;
    
    if (window.confirm('Вы уверены, что хотите удалить эту продажу? Товар будет возвращен на склад.')) {
      const sale = sales.find(s => s.id === saleId);
      if (sale) {
        // Return quantity to warehouse
        const product = products.find(p => p.id === sale.productId);
        if (product) {
          await productsDB.update(product.id, {
            quantity: product.quantity + sale.quantity,
            outgoing: Math.max(0, product.outgoing - sale.quantity)
          });
        }
        await salesDB.delete(saleId);
        loadData();
      }
    }
  };

  // Global listener for physical barcode scanners
  useEffect(() => {
    let barcode = '';
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field (except if we want to allow scanning while searching)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Enter') {
        if (barcode.length > 3) {
          const product = products.find(p => p.barcode === barcode);
          if (product) {
            addToCart(product);
            setIsModalOpen(true);
          } else {
            alert(`${lang.productNotFound} (Штрих-код: ${barcode})`);
          }
        }
        barcode = '';
      } else if (e.key.length === 1) {
        barcode += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          barcode = '';
        }, 100); // 100ms timeout to distinguish scanner from manual typing
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, lang]);

  const totalCartAmount = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      alert(lang.notEnoughStock);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.quantity) {
          alert(lang.notEnoughStock);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (quantity > product.quantity) {
      alert(lang.notEnoughStock);
      return;
    }

    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity: Math.max(0.01, quantity) } : item
    ));
  };

  const updateCartItemPrice = (productId: string, price: number) => {
    if (currentUser?.role !== 'admin') return; // Only admin can change price
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, product: { ...item.product, sellingPrice: Math.max(0, price) } } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleScan = (decodedText: string) => {
    setIsScannerOpen(false);
    const product = products.find(p => p.barcode === decodedText);
    if (product) {
      addToCart(product);
      setIsModalOpen(true);
    } else {
      if (window.confirm(`${lang.productNotFound}. Добавить новый товар? / Илова кардани моли нав?`)) {
        navigate('/warehouse');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const currentPaid = Number(paidAmount) || 0;

    if (currentPaid < totalCartAmount && !customerName) {
      alert('Customer name is required for unpaid sales (debts).');
      return;
    }

    // Distribute paid amount proportionally or just record the total debt
    // For simplicity, we create individual sales, but one debt record if unpaid
    
    const saleIds: string[] = [];

    for (const item of cart) {
      const product = products.find(p => p.id === item.product.id);
      if (!product) continue;

      const totalAmount = item.quantity * item.product.sellingPrice;
      const profit = (item.product.sellingPrice - product.purchasePrice) * item.quantity;

      // 1. Create Sale
      const newSale = await salesDB.add({
        date: Date.now(),
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: item.quantity,
        sellingPrice: item.product.sellingPrice,
        totalAmount,
        costPrice: product.purchasePrice,
        profit,
        paidAmount: totalAmount, // Will adjust below for debts
        customerName: customerName
      });
      saleIds.push(newSale.id);

      // 2. Update Warehouse
      await productsDB.update(product.id, {
        quantity: product.quantity - item.quantity,
        outgoing: product.outgoing + item.quantity
      });
    }

    // 3. Create Debt if not fully paid
    if (currentPaid < totalCartAmount) {
      const debtAmount = totalCartAmount - currentPaid;
      await customerDebtsDB.add({
        date: Date.now(),
        customerName: customerName,
        productName: `Чек из ${cart.length} товаров`,
        debtAmount,
        paid: 0,
        remaining: debtAmount,
        saleId: saleIds.join(',')
      });
    }

    setIsModalOpen(false);
    setCart([]);
    setPaidAmount('');
    setCustomerName('');
    loadData();
  };

  const filteredSales = sales.filter(s => 
    s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{lang.sales}</h1>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex-1 md:flex-none"
          >
            <ScanLine className="w-5 h-5" />
            <span className="hidden sm:inline">{lang.scanBarcode}</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors relative flex-1 md:flex-none"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="hidden sm:inline">Корзина</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {cart.length}
              </span>
            )}
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
                <th className="p-4 font-medium">{lang.date}</th>
                <th className="p-4 font-medium">{lang.productName}</th>
                <th className="p-4 font-medium">{lang.unit}</th>
                <th className="p-4 font-medium">{lang.quantity}</th>
                <th className="p-4 font-medium">{lang.sellingPrice}</th>
                <th className="p-4 font-medium">{lang.totalAmount}</th>
                {currentUser?.role === 'admin' && (
                  <>
                    <th className="p-4 font-medium text-gray-400">{lang.costPrice}</th>
                    <th className="p-4 font-medium text-green-600">{lang.profit}</th>
                    <th className="p-4 font-medium">Действия</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 text-gray-600">{format(sale.date, 'MMM dd, yyyy HH:mm')}</td>
                  <td className="p-4 font-medium text-gray-900">
                    {sale.productName}
                    {sale.customerName && <span className="block text-xs text-gray-500">{sale.customerName}</span>}
                  </td>
                  <td className="p-4 text-gray-600">{sale.unit}</td>
                  <td className="p-4 font-medium">{sale.quantity}</td>
                  <td className="p-4 text-gray-600">{sale.sellingPrice.toFixed(2)} {currency}</td>
                  <td className="p-4 font-bold text-gray-900">{sale.totalAmount.toFixed(2)} {currency}</td>
                  {currentUser?.role === 'admin' && (
                    <>
                      <td className="p-4 text-gray-400">{sale.costPrice.toFixed(2)} {currency}</td>
                      <td className="p-4 font-bold text-green-600">{sale.profit.toFixed(2)} {currency}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleDeleteSale(sale.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Отменить продажу (Возврат)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={currentUser?.role === 'admin' ? 9 : 6} className="p-8 text-center text-gray-500">
                    {lang.noSales}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Layout */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredSales.map(sale => (
            <div key={sale.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-900">{sale.productName}</h3>
                  <p className="text-xs text-gray-500">{format(sale.date, 'MMM dd, yyyy HH:mm')}</p>
                  {sale.customerName && <p className="text-xs text-indigo-600 mt-1">{sale.customerName}</p>}
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="font-bold text-gray-900 block">{sale.totalAmount.toFixed(2)} {currency}</span>
                  {currentUser?.role === 'admin' && (
                    <span className="text-xs text-green-600 font-medium">+{sale.profit.toFixed(2)} {currency}</span>
                  )}
                  {currentUser?.role === 'admin' && (
                    <button 
                      onClick={() => handleDeleteSale(sale.id)}
                      className="mt-2 text-xs flex items-center space-x-1 text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Возврат</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mt-3 bg-gray-50 p-2 rounded-lg">
                <div>
                  <span className="block text-xs text-gray-500">{lang.quantity}</span>
                  <span className="font-medium">{sale.quantity} {sale.unit}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">{lang.sellingPrice}</span>
                  <span className="font-medium">{sale.sellingPrice.toFixed(2)}</span>
                </div>
                {currentUser?.role === 'admin' && (
                  <div className="text-right">
                    <span className="block text-xs text-gray-500">{lang.costPrice}</span>
                    <span className="font-medium text-gray-500">{sale.costPrice.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredSales.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {lang.noSales}
            </div>
          )}
        </div>
      </div>

      {isScannerOpen && (
        <BarcodeScanner 
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Корзина продаж</h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setIsScannerOpen(true);
                }}
                className="flex items-center space-x-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
              >
                <ScanLine className="w-4 h-4" />
                <span>Сканировать еще</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Добавить товар вручную</label>
                <select 
                  onChange={e => {
                    const p = products.find(p => p.id === e.target.value);
                    if (p) addToCart(p);
                    e.target.value = '';
                  }} 
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>-- Выберите товар --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                      {p.name} ({p.quantity} {p.unit}) - {p.sellingPrice || 0} {currency}
                    </option>
                  ))}
                </select>
              </div>

              {cart.length > 0 ? (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{item.product.name}</h4>
                        <p className="text-sm text-gray-500">В наличии: {item.product.quantity} {item.product.unit}</p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="w-24">
                          <label className="block text-xs text-gray-500 mb-1">Кол-во</label>
                          <input 
                            type="number" 
                            min="0.01" 
                            step="0.01" 
                            value={item.quantity} 
                            onChange={e => updateCartItemQuantity(item.product.id, parseFloat(e.target.value) || 0)} 
                            className="w-full px-2 py-1 rounded border border-gray-200 text-sm"
                          />
                        </div>
                        
                        <div className="w-28">
                          <label className="block text-xs text-gray-500 mb-1">Цена ({currency})</label>
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            value={item.product.sellingPrice} 
                            onChange={e => updateCartItemPrice(item.product.id, parseFloat(e.target.value) || 0)} 
                            disabled={currentUser?.role !== 'admin'}
                            className="w-full px-2 py-1 rounded border border-gray-200 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </div>

                        <div className="w-24 text-right">
                          <label className="block text-xs text-gray-500 mb-1">Сумма</label>
                          <span className="font-bold text-gray-900">{(item.quantity * item.product.sellingPrice).toFixed(2)}</span>
                        </div>

                        <button 
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-4"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Корзина пуста. Отсканируйте или выберите товар.
                </div>
              )}
            </div>

            <form onSubmit={handleSave} className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Оплачено ({currency})</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      max={totalCartAmount} 
                      value={paidAmount} 
                      onChange={e => setPaidAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" 
                      placeholder="Сумма оплаты"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Имя клиента (для долга)</label>
                    <input 
                      type="text" 
                      value={customerName} 
                      onChange={e => setCustomerName(e.target.value)} 
                      className={`w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none ${Number(paidAmount) < totalCartAmount && !customerName ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'}`} 
                      placeholder="Обязательно при неполной оплате"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Итого к оплате</p>
                  <p className="text-3xl font-bold text-indigo-600">{totalCartAmount.toFixed(2)} {currency}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-lg transition-colors font-medium">Закрыть</button>
                <button type="submit" disabled={cart.length === 0} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg transition-colors font-medium">Завершить продажу</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

