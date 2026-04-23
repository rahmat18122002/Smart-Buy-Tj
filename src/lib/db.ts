import { Product, Sale, Expense, CustomerDebt, SupplierDebt, User } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

class LocalDB<T extends { id: string }> {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    if (!localStorage.getItem(this.collectionName)) {
      localStorage.setItem(this.collectionName, JSON.stringify([]));
    }
  }

  async getAll(): Promise<T[]> {
    const data = localStorage.getItem(this.collectionName);
    return data ? JSON.parse(data) : [];
  }

  async getById(id: string): Promise<T | undefined> {
    const items = await this.getAll();
    return items.find(item => item.id === id);
  }

  async add(item: Omit<T, 'id'>): Promise<T> {
    const items = await this.getAll();
    const newItem = { ...item, id: generateId() } as unknown as T;
    items.push(newItem);
    localStorage.setItem(this.collectionName, JSON.stringify(items));
    return newItem;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const items = await this.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Item not found');
    
    items[index] = { ...items[index], ...updates };
    localStorage.setItem(this.collectionName, JSON.stringify(items));
    return items[index];
  }

  async delete(id: string): Promise<void> {
    const items = await this.getAll();
    const filtered = items.filter(item => item.id !== id);
    localStorage.setItem(this.collectionName, JSON.stringify(filtered));
  }

  async clear(): Promise<void> {
    localStorage.setItem(this.collectionName, JSON.stringify([]));
  }
}

export const productsDB = new LocalDB<Product>('v2_products');
export const salesDB = new LocalDB<Sale>('v2_sales');
export const expensesDB = new LocalDB<Expense>('v2_expenses');
export const customerDebtsDB = new LocalDB<CustomerDebt>('v2_customer_debts');
export const supplierDebtsDB = new LocalDB<SupplierDebt>('v2_supplier_debts');
export const usersDB = new LocalDB<User>('v2_users');

export const seedDatabase = async () => {
  // Принудительно очищаем старых пользователей один раз
  if (!localStorage.getItem('v2_users_cleared')) {
    await usersDB.clear();
    localStorage.setItem('v2_users_cleared', 'true');
  }

  const users = await usersDB.getAll();
  
  // Если суперадмин зарегистрировался вручную как pending, или его вообще нет:
  const adminUser = users.find(u => u.email === 'admin1812@gmail.com');
  if (!adminUser) {
    await usersDB.add({
      email: 'admin1812@gmail.com',
      password: '988329085',
      role: 'superadmin',
      createdAt: Date.now()
    });
  } else if (adminUser.role !== 'superadmin' || adminUser.password !== '988329085') {
    // Принудительно исправляем роль на суперадмина
    await usersDB.update(adminUser.id, { role: 'superadmin', password: '988329085' });
  }

  // One-time clear of all test data
  if (!localStorage.getItem('v2_initial_clear_done')) {
    await productsDB.clear();
    await salesDB.clear();
    await expensesDB.clear();
    await customerDebtsDB.clear();
    await supplierDebtsDB.clear();
    localStorage.setItem('v2_initial_clear_done', 'true');
  }
};
