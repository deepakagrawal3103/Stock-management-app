
import { Product, Order, OrderStatus, Expense } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'print_bazar_products_v2', // Version bumped to force new seed data load
  ORDERS: 'print_bazar_orders',
  ROUGH_WORK: 'print_bazar_rough_work',
  EXPENSES: 'print_bazar_expenses',
};

// Initial Seed Data
const SEED_PRODUCTS: Product[] = [
  { id: '101', name: 'Beee', category: 'Practical file', costPrice: 45, sellingPrice: 75, quantity: 5, minStock: 2 },
  { id: '102', name: 'Chemistry (45page)', category: 'Practical file', costPrice: 34, sellingPrice: 65, quantity: 4, minStock: 2 },
  { id: '103', name: 'Chemistry 39 page', category: 'Practical file', costPrice: 30, sellingPrice: 65, quantity: 3, minStock: 2 },
  { id: '104', name: 'Chemistry 39page sprial', category: 'Practical file', costPrice: 45, sellingPrice: 80, quantity: 0, minStock: 2 },
  { id: '105', name: 'Civil', category: 'General', costPrice: 29, sellingPrice: 60, quantity: 1, minStock: 2 },
  { id: '106', name: 'Manufacturing', category: 'Practical file', costPrice: 57, sellingPrice: 85, quantity: 9, minStock: 2 },
  { id: '107', name: 'Mechanical file', category: 'Practical file', costPrice: 32, sellingPrice: 65, quantity: 5, minStock: 2 },
  { id: '108', name: 'Physics file', category: 'Practical file', costPrice: 46, sellingPrice: 75, quantity: 2, minStock: 2 },
  { id: '109', name: 'Digital system', category: 'Practical file', costPrice: 33, sellingPrice: 60, quantity: 1, minStock: 2 },
  { id: '110', name: 'OOPM', category: 'Practical file', costPrice: 32, sellingPrice: 55, quantity: 2, minStock: 2 },
];

export const getProducts = (): Product[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(SEED_PRODUCTS));
      return SEED_PRODUCTS;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error("Error parsing products from storage", e);
    return SEED_PRODUCTS;
  }
};

export const saveProducts = (products: Product[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.error("Error saving products", e);
  }
};

export const getOrders = (): Order[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error parsing orders from storage", e);
    return [];
  }
};

export const saveOrders = (orders: Order[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.error("Error saving orders", e);
  }
};

export const updateProductStock = (productId: string, quantityChange: number) => {
  try {
    const products = getProducts();
    const updated = products.map(p => {
      if (p.id === productId) {
        return { ...p, quantity: p.quantity + quantityChange };
      }
      return p;
    });
    saveProducts(updated);
  } catch (e) {
    console.error("Error updating stock", e);
  }
};

export const getRoughWork = (): string => {
  return localStorage.getItem(STORAGE_KEYS.ROUGH_WORK) || '';
};

export const saveRoughWork = (content: string) => {
  localStorage.setItem(STORAGE_KEYS.ROUGH_WORK, content);
};

// Expense Methods
export const getExpenses = (): Expense[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error parsing expenses", e);
    return [];
  }
};

export const saveExpenses = (expenses: Expense[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  } catch (e) {
    console.error("Error saving expenses", e);
  }
};
