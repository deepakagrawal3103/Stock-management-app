import { Product, Order, OrderStatus } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'print_bazar_products',
  ORDERS: 'print_bazar_orders',
};

// Initial Seed Data
const SEED_PRODUCTS: Product[] = [
  { id: '1', name: 'A4 B&W Print', category: 'Document', costPrice: 1.5, sellingPrice: 5, quantity: 500, minStock: 100 },
  { id: '2', name: 'A4 Color Print', category: 'Document', costPrice: 4, sellingPrice: 15, quantity: 200, minStock: 50 },
  { id: '3', name: 'Spiral Binding', category: 'Service', costPrice: 15, sellingPrice: 40, quantity: 30, minStock: 10 },
  { id: '4', name: 'Glossy Photo Paper', category: 'Photo', costPrice: 8, sellingPrice: 25, quantity: 45, minStock: 15 },
];

export const getProducts = (): Product[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(SEED_PRODUCTS));
    return SEED_PRODUCTS;
  }
  return JSON.parse(stored);
};

export const saveProducts = (products: Product[]) => {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
};

export const getOrders = (): Order[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
  return stored ? JSON.parse(stored) : [];
};

export const saveOrders = (orders: Order[]) => {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
};

export const updateProductStock = (productId: string, quantityChange: number) => {
  const products = getProducts();
  const updated = products.map(p => {
    if (p.id === productId) {
      return { ...p, quantity: p.quantity + quantityChange };
    }
    return p;
  });
  saveProducts(updated);
};