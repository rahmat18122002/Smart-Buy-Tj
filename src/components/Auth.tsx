import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { usersDB } from '../lib/db';

export const Auth = () => {
  const { setCurrentUser } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const users = await usersDB.getAll();

      if (isLogin) {
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
          if (user.role === 'pending') {
            setError('Ваша заявка находится на рассмотрении администратора.');
          } else {
            setCurrentUser(user);
          }
        } else {
          setError('Неверный email или пароль.');
        }
      } else {
        // Registration
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
          setError('Пользователь с таким email уже существует.');
          return;
        }

        await usersDB.add({
          email,
          password,
          role: 'pending',
          createdAt: Date.now()
        });

        setSuccess('Регистрация успешна! Ожидайте подтверждения от администратора.');
        setIsLogin(true); // Switch back to login
        setPassword('');
      }
    } catch (err) {
      setError('Произошла ошибка. Попробуйте еще раз.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isLogin ? 'Вход в систему' : 'Регистрация'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isLogin ? 'Доступ только для зарегистрированных сотрудников' : 'Создайте аккаунт и дождитесь одобрения'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 text-sm text-green-700">
                {success}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Пароль
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLogin ? 'Войти' : 'Зарегистрироваться'}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
