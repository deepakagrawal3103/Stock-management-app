
import { Product, Order, OrderStatus, Expense } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'print_bazar_products',
  ORDERS: 'print_bazar_orders',
  ROUGH_WORK: 'print_bazar_rough_work',
  EXPENSES: 'print_bazar_expenses',
};

// Initial Seed Data
const SEED_PRODUCTS: Product[] = [
  { id: '1', name: 'A4 B&W Print', category: 'Document', costPrice: 1.5, sellingPrice: 5, quantity: 500, minStock: 100 },
  { id: '2', name: 'A4 Color Print', category: 'Document', costPrice: 4, sellingPrice: 15, quantity: 200, minStock: 50 },
  { id: '3', name: 'Spiral Binding', category: 'Service', costPrice: 15, sellingPrice: 40, quantity: 30, minStock: 10 },
  { id: '4', name: 'Glossy Photo Paper', category: 'Photo', costPrice: 8, sellingPrice: 25, quantity: 45, minStock: 15 },
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
