import React, { useEffect, useState } from 'react';
import { usersDB } from '../lib/db';
import { User } from '../types';
import { Check, Trash2 } from 'lucide-react';

export const SuperAdminPanel = () => {
  const [users, setUsers] = useState<User[]>([]);

  const loadUsers = async () => {
    const data = await usersDB.getAll();
    setUsers(data.filter(u => u.role !== 'superadmin'));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAccept = async (userId: string) => {
    await usersDB.update(userId, { role: 'admin' });
    loadUsers();
  };

  const handleReject = async (userId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту заявку?')) {
      await usersDB.delete(userId);
      loadUsers();
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Заявки от владельцев</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Дата регистрации</th>
                <th className="p-4 font-medium">Статус</th>
                <th className="p-4 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{user.email}</td>
                  <td className="p-4 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {user.role === 'pending' ? 'Ожидает одобрения' : 'Одобрен (Владелец)'}
                    </span>
                  </td>
                  <td className="p-4 flex items-center space-x-3">
                    {user.role === 'pending' && (
                      <button 
                        onClick={() => handleAccept(user.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md transition-colors font-medium"
                      >
                        <Check className="w-4 h-4" />
                        <span>Принять</span>
                      </button>
                    )}
                    <button 
                      onClick={() => handleReject(user.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Удалить заявку/пользователя"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Нет зарегистрированных пользователей
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
