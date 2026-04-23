export type Unit = 'шт' | 'м' | 'кг';

export type Role = 'superadmin' | 'admin' | 'cashier' | 'warehouse' | 'pending';

export interface User {
  id: string;
  email: string;
  password?: string; // For local auth simulation
  role: Role;
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  unit: Unit;
  purchasePrice: number; // себестоимость
  sellingPrice: number; // цена продажи (устанавливается владельцем/складом)
  quantity: number; // Remaining stock
  incoming: number; // приход
  outgoing: number; // расход
  createdAt: number;
  barcode?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id: string;
  date: number;
  productId: string;
  productName: string;
  unit: Unit;
  quantity: number;
  sellingPrice: number;
  totalAmount: number; // qty * sellingPrice
  costPrice: number; // purchasePrice from warehouse at the time of sale
  profit: number; // (sellingPrice - costPrice) * qty
  paidAmount: number;
  customerId?: string;
  customerName?: string;
}

export type ExpenseCategory = 'Магазин' | 'Налог и госпошлины' | 'Зарплата' | 'Дополнительные';

export interface Expense {
  id: string;
  date: number;
  name: string;
  category: ExpenseCategory;
  amount: number;
}

export interface CustomerDebt {
  id: string;
  date: number;
  customerName: string;
  productName: string;
  debtAmount: number; // totalAmount - paidAmount from sale
  paid: number;
  remaining: number; // debtAmount - paid
  saleId: string;
}

export interface SupplierDebt {
  id: string;
  date: number;
  supplierName: string;
  amount: number;
  paid: number;
  remaining: number; // amount - paid
  comment: string;
}
