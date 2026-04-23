import React, { useEffect, useState } from 'react';
import { usersDB } from '../lib/db';
import { User, Role } from '../types';
import { useStore } from '../store/useStore';
import { Plus, Trash2 } from 'lucide-react';

export const AdminPanel = () => {
  const { currentUser } = useStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'cashier' as Role });
  const [error, setError] = useState('');

  const loadUsers = async () => {
    const data = await usersDB.getAll();
    // Владельцы магазинов видят только кассиров и складчиков. Они не видят суперадмина или других владельцев.
    setUsers(data.filter(u => u.role === 'cashier' || u.role === 'warehouse'));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    await usersDB.update(userId, { role: newRole });
    loadUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      await usersDB.delete(userId);
      loadUsers();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const allUsers = await usersDB.getAll();
    if (allUsers.some(u => u.email === newUser.email)) {
      setError('Пользователь с таким email уже существует');
      return;
    }

    await usersDB.add({
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
      createdAt: Date.now()
    });

    setIsModalOpen(false);
    setNewUser({ email: '', password: '', role: 'cashier' });
    loadUsers();
  };

  if (currentUser?.role !== 'admin') {
    return <div className="p-8 text-center text-red-600">Доступ запрещен</div>;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Сотрудники магазина</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors w-full md:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Добавить пользователя</span>
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Дата регистрации</th>
                <th className="p-4 font-medium">Роль</th>
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
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'cashier' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'warehouse' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.role === 'pending' ? 'Ожидает' : 
                       user.role === 'admin' ? 'Владелец' :
                       user.role === 'cashier' ? 'Кассир' : 'Складчик'}
                    </span>
                  </td>
                  <td className="p-4 flex items-center space-x-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="px-3 py-1 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="cashier">Кассир</option>
                      <option value="warehouse">Складчик</option>
                    </select>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Удалить пользователя"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Нет других пользователей
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Создать пользователя</h2>
            </div>
            <form onSubmit={handleCreateUser} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Пароль *</label>
                  <input required type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Роль *</label>
                  <select required value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="cashier">Кассир</option>
                    <option value="warehouse">Складчик</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
