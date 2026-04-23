import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  DollarSign,
  Users,
  BarChart3,
  Download,
  Settings,
  LogOut
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { t } from '../locales/translations';

export const Sidebar = () => {
  const { language, setLanguage, currency, setCurrency, currentUser, setCurrentUser } = useStore();
  const lang = t[language];
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const navItems = [
    ...(currentUser?.role === 'superadmin' ? [{ to: '/requests', icon: Users, label: 'Заявки' }] : []),
    ...(currentUser?.role === 'admin' || currentUser?.role === 'cashier' ? [{ to: '/sales', icon: ShoppingCart, label: lang.sales }] : []),
    ...(currentUser?.role === 'admin' || currentUser?.role === 'warehouse' ? [{ to: '/warehouse', icon: Package, label: lang.warehouse }] : []),
    ...(currentUser?.role === 'admin' ? [{ to: '/expenses', icon: DollarSign, label: lang.expenses }] : []),
    ...(currentUser?.role === 'admin' || currentUser?.role === 'cashier' ? [{ to: '/debts', icon: Users, label: lang.debts }] : []),
    ...(currentUser?.role === 'admin' ? [{ to: '/pnl', icon: BarChart3, label: lang.pnl }] : []),
    ...(currentUser?.role === 'admin' ? [{ to: '/admin', icon: Settings, label: 'Сотрудники' }] : []),
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-gray-900 text-white h-screen flex-col fixed left-0 top-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-indigo-400">Smart Buy Tj</h1>
          <p className="text-xs text-gray-400 mt-1">{lang.systemName}</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="mb-4 flex items-center justify-between text-gray-400 text-sm">
            <span className="truncate pr-2">{currentUser?.email}</span>
            <button onClick={() => setCurrentUser(null)} className="hover:text-white" title="Выйти">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-1 mb-2">
            <button
              onClick={() => setLanguage('ru')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${language === 'ru' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              РУС
            </button>
            <button
              onClick={() => setLanguage('tg')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${language === 'tg' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              ТОҶ
            </button>
          </div>
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setCurrency('с.')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${currency === 'с.' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              TJS
            </button>
            <button
              onClick={() => setCurrency('₽')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${currency === '₽' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              RUB
            </button>
            <button
              onClick={() => setCurrency('$')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${currency === '$' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              USD
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 text-white flex justify-around items-center p-2 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-colors ${
                isActive 
                  ? 'text-indigo-400' 
                  : 'text-gray-400 hover:text-gray-200'
              }`
            }
          >
            <item.icon className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium truncate w-full text-center px-1">{item.label}</span>
          </NavLink>
        ))}
      </div>
      
      {/* Mobile Header (Settings) */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-900 text-white flex justify-between items-center p-4 z-50 shadow-md">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold tracking-tight text-indigo-400">Smart Buy Tj</h1>
          <button onClick={() => setCurrentUser(null)} className="text-gray-400 hover:text-white p-1">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="flex space-x-2 items-center">
          <button
            onClick={() => setLanguage(language === 'ru' ? 'tg' : 'ru')}
            className="px-3 py-1 bg-gray-800 rounded-md text-sm font-medium text-gray-300"
          >
            {language === 'ru' ? 'РУС' : 'ТОҶ'}
          </button>
          <button
            onClick={() => {
              if (currency === 'с.') setCurrency('₽');
              else if (currency === '₽') setCurrency('$');
              else setCurrency('с.');
            }}
            className="px-3 py-1 bg-gray-800 rounded-md text-sm font-medium text-gray-300"
          >
            {currency === 'с.' ? 'TJS' : currency === '₽' ? 'RUB' : 'USD'}
          </button>
        </div>
      </div>
    </>
  );
};
