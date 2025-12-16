
import { Product, Order, OrderStatus, Expense, UnpaidWriting, PartialPayment, Category, OrderCategoryMap, StoreStock, ManualNeed } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'print_bazar_products_v4', // Version bumped to v4 for new data
  ORDERS: 'print_bazar_orders',
  ROUGH_WORK: 'print_bazar_rough_work',
  EXPENSES: 'print_bazar_expenses',
  // V2 Keys
  UNPAID_WRITINGS: 'print_bazar_unpaid_writings',
  PARTIAL_PAYMENTS: 'print_bazar_partial_payments',
  CATEGORIES: 'print_bazar_categories',
  ORDER_CATEGORY_MAP: 'print_bazar_order_category_map',
  // New V2 Modules
  STORE_STOCK: 'print_bazar_store_stock',
  MANUAL_NEEDS: 'print_bazar_manual_needs',
  NEEDS_NOTE: 'print_bazar_needs_note',
  LOGISTICS_PLAN: 'print_bazar_logistics_plan', // New key for persisting carry plan
};

// Initial Seed Data
const SEED_PRODUCTS: Product[] = [
  { id: '101', name: 'Beee', category: 'Practical file', costPrice: 45, sellingPrice: 75, quantity: 6, minStock: 2 },
  { id: '102', name: 'Chemistry (45page)', category: 'Practical file', costPrice: 34, sellingPrice: 65, quantity: 5, minStock: 2 },
  { id: '103', name: 'Chemistry 39 page', category: 'Practical file', costPrice: 30, sellingPrice: 65, quantity: 1, minStock: 2 },
  { id: '104', name: 'Chemistry 39page sprial', category: 'Practical file', costPrice: 45, sellingPrice: 80, quantity: 1, minStock: 2 },
  { id: '105', name: 'Civil', category: 'General', costPrice: 29, sellingPrice: 60, quantity: 2, minStock: 2 },
  { id: '106', name: 'Manufacturing', category: 'Practical file', costPrice: 57, sellingPrice: 85, quantity: 3, minStock: 2 },
  { id: '107', name: 'Mechanical file', category: 'Practical file', costPrice: 32, sellingPrice: 65, quantity: 3, minStock: 2 },
  { id: '108', name: 'Physics file', category: 'Practical file', costPrice: 46, sellingPrice: 75, quantity: 1, minStock: 2 },
  { id: '109', name: 'Digital system', category: 'Practical file', costPrice: 33, sellingPrice: 60, quantity: 1, minStock: 2 },
  { id: '110', name: 'OOPM', category: 'Practical file', costPrice: 32, sellingPrice: 55, quantity: 2, minStock: 2 },
  { id: '111', name: 'CRT file', category: 'General', costPrice: 9, sellingPrice: 20, quantity: 0, minStock: 2 },
  { id: '112', name: 'English with sprial', category: 'Practical file', costPrice: 73, sellingPrice: 105, quantity: 10, minStock: 2 },
  { id: '113', name: 'Computer', category: 'Practical file', costPrice: 21, sellingPrice: 35, quantity: 2, minStock: 2 },
  { id: '114', name: 'Beee with sprial', category: 'Practical file', costPrice: 60, sellingPrice: 90, quantity: 0, minStock: 2 },
  { id: '115', name: 'Chemistry (49 with sprial )', category: 'Practical file', costPrice: 50, sellingPrice: 80, quantity: 1, minStock: 2 },
  { id: '116', name: 'English file', category: 'Practical file', costPrice: 58, sellingPrice: 90, quantity: 0, minStock: 2 },
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

// --- V2 API FUNCTIONS (ADDITIVE) ---

export const v2 = {
  // NEEDS NOTE
  getNeedsNote: (): string => {
    return localStorage.getItem(STORAGE_KEYS.NEEDS_NOTE) || '';
  },
  
  saveNeedsNote: (content: string) => {
    localStorage.setItem(STORAGE_KEYS.NEEDS_NOTE, content);
  },

  // UNPAID WRITINGS
  getUnpaidWritings: (): UnpaidWriting[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.UNPAID_WRITINGS);
      return stored ? JSON.parse(stored) : [];
    } catch(e) { return []; }
  },

  saveUnpaidWritings: (items: UnpaidWriting[]) => {
    localStorage.setItem(STORAGE_KEYS.UNPAID_WRITINGS, JSON.stringify(items));
  },

  addUnpaidWriting: (item: UnpaidWriting) => {
    const items = v2.getUnpaidWritings();
    v2.saveUnpaidWritings([...items, item]);
  },

  updateUnpaidWriting: (item: UnpaidWriting) => {
    const items = v2.getUnpaidWritings();
    v2.saveUnpaidWritings(items.map(i => i.id === item.id ? item : i));
  },

  deleteUnpaidWriting: (id: string) => {
    const items = v2.getUnpaidWritings();
    v2.saveUnpaidWritings(items.filter(i => i.id !== id));
  },

  // PARTIAL PAYMENTS
  getPartialPayments: (): PartialPayment[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PARTIAL_PAYMENTS);
      return stored ? JSON.parse(stored) : [];
    } catch(e) { return []; }
  },

  addPartialPayment: (payment: PartialPayment) => {
    const payments = v2.getPartialPayments();
    localStorage.setItem(STORAGE_KEYS.PARTIAL_PAYMENTS, JSON.stringify([...payments, payment]));
  },

  getPartialPaymentsForOrder: (orderId: string): PartialPayment[] => {
    return v2.getPartialPayments().filter(p => p.orderId === orderId);
  },

  // CATEGORIES
  getCategories: (): Category[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      const defaults = [
        { id: 'cat_unpaid', name: 'Unpaid', color: 'red' },
        { id: 'cat_urgent', name: 'Urgent', color: 'orange' },
        { id: 'cat_regular', name: 'Regular', color: 'blue' }
      ];
      return stored ? JSON.parse(stored) : defaults;
    } catch(e) { return []; }
  },

  saveCategories: (categories: Category[]) => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  },

  addCategory: (category: Category) => {
    const cats = v2.getCategories();
    v2.saveCategories([...cats, category]);
  },

  deleteCategory: (id: string) => {
    const cats = v2.getCategories();
    v2.saveCategories(cats.filter(c => c.id !== id));
  },

  // ORDER CATEGORY MAPPING & SYNC LOGIC
  getOrderCategoryMap: (): OrderCategoryMap[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ORDER_CATEGORY_MAP);
      return stored ? JSON.parse(stored) : [];
    } catch(e) { return []; }
  },

  assignCategoryToOrder: (orderId: string, categoryId: string) => {
    const map = v2.getOrderCategoryMap();
    const newMap = map.filter(m => m.orderId !== orderId);
    newMap.push({ orderId, categoryId });
    localStorage.setItem(STORAGE_KEYS.ORDER_CATEGORY_MAP, JSON.stringify(newMap));

    const categories = v2.getCategories();
    const category = categories.find(c => c.id === categoryId);
    
    if (category && category.name.toLowerCase() === 'unpaid') {
      const unpaidWritings = v2.getUnpaidWritings();
      const existing = unpaidWritings.find(u => u.relatedOrderId === orderId);
      
      if (!existing) {
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        
        if (order) {
          const newWriting: UnpaidWriting = {
            id: crypto.randomUUID(),
            title: `Order #${order.id.slice(0,5)} - ${order.customerName}`,
            description: `Auto-generated from Unpaid category. Note: ${order.note || 'None'}`,
            amount: order.totalAmount,
            category: 'Unpaid',
            relatedOrderId: order.id,
            createdAt: new Date().toISOString(),
            status: 'UNPAID'
          };
          v2.addUnpaidWriting(newWriting);
        }
      }
    }
  },

  getCategoryForOrder: (orderId: string): Category | undefined => {
    const map = v2.getOrderCategoryMap();
    const mapping = map.find(m => m.orderId === orderId);
    if (!mapping) return undefined;
    const cats = v2.getCategories();
    return cats.find(c => c.id === mapping.categoryId);
  },

  // --- NEW MODULE: STORE STOCK MANAGEMENT ---
  getStoreStocks: (): StoreStock[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STORE_STOCK);
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  },

  saveStoreStocks: (stocks: StoreStock[]) => {
    localStorage.setItem(STORAGE_KEYS.STORE_STOCK, JSON.stringify(stocks));
  },

  updateStoreStock: (productId: string, deepakStock: number, dimpleStock: number) => {
    const stocks = v2.getStoreStocks();
    const existingIndex = stocks.findIndex(s => s.productId === productId);
    
    const newEntry: StoreStock = {
      productId,
      deepakStock,
      dimpleStock,
      lastUpdated: new Date().toISOString()
    };

    let updatedStocks;
    if (existingIndex >= 0) {
      updatedStocks = [...stocks];
      updatedStocks[existingIndex] = newEntry;
    } else {
      updatedStocks = [...stocks, newEntry];
    }
    v2.saveStoreStocks(updatedStocks);

    // Sync Total with Legacy Product Table to maintain app compatibility
    const total = deepakStock + dimpleStock;
    const products = getProducts();
    const prodIndex = products.findIndex(p => p.id === productId);
    if (prodIndex >= 0) {
      products[prodIndex].quantity = total;
      saveProducts(products);
    }
  },

  // --- NEW MODULE: MANUAL NEEDS ---
  getManualNeeds: (): ManualNeed[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MANUAL_NEEDS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  },

  saveManualNeeds: (needs: ManualNeed[]) => {
    localStorage.setItem(STORAGE_KEYS.MANUAL_NEEDS, JSON.stringify(needs));
  },

  addOrUpdateManualNeed: (productId: string, totalRequired: number, note: string) => {
    const needs = v2.getManualNeeds();
    const existingIndex = needs.findIndex(n => n.productId === productId);

    const newEntry: ManualNeed = {
      id: existingIndex >= 0 ? needs[existingIndex].id : crypto.randomUUID(),
      productId,
      totalRequired,
      note,
      createdAt: new Date().toISOString()
    };

    let updatedNeeds;
    if (existingIndex >= 0) {
      updatedNeeds = [...needs];
      updatedNeeds[existingIndex] = newEntry;
    } else {
      updatedNeeds = [...needs, newEntry];
    }
    v2.saveManualNeeds(updatedNeeds);
  },

  deleteManualNeed: (id: string) => {
    const needs = v2.getManualNeeds();
    v2.saveManualNeeds(needs.filter(n => n.id !== id));
  },

  // --- NEW MODULE: LOGISTICS PLAN PERSISTENCE ---
  getLogisticsPlan: (): Record<string, { productId: string; carryDeepak: number; carryDimple: number }> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOGISTICS_PLAN);
      return stored ? JSON.parse(stored) : {};
    } catch (e) { return {}; }
  },
  
  saveLogisticsPlan: (plan: Record<string, any>) => {
    localStorage.setItem(STORAGE_KEYS.LOGISTICS_PLAN, JSON.stringify(plan));
  },

  // --- LOGISTICS STOCK PROCESSING (When Order Completes) ---
  processOrderCompletionStock: (order: Order) => {
    const stocks = v2.getStoreStocks();
    const plan = v2.getLogisticsPlan();
    const products = getProducts();

    order.items.forEach(item => {
      if (item.isCustom) return; // Skip custom items (no stock)

      // 1. Identify Deduction Source (Deepak vs Dimple)
      let deductDeepak = 0;
      let deductDimple = 0;
      let qtyToDeduct = item.quantity;
      const itemPlan = plan[item.productId];

      if (itemPlan) {
        // A plan exists, try to follow it
        // Priority: Take from Carry Deepak first
        const plannedDeepak = itemPlan.carryDeepak || 0;
        const takeDeepak = Math.min(qtyToDeduct, plannedDeepak);
        deductDeepak += takeDeepak;
        qtyToDeduct -= takeDeepak;

        // Then take from Carry Dimple
        const plannedDimple = itemPlan.carryDimple || 0;
        const takeDimple = Math.min(qtyToDeduct, plannedDimple);
        deductDimple += takeDimple;
        qtyToDeduct -= takeDimple;
        
        // Update Plan (Consume it, since order is fulfilled)
        itemPlan.carryDeepak = Math.max(0, plannedDeepak - takeDeepak);
        itemPlan.carryDimple = Math.max(0, plannedDimple - takeDimple);
      }

      // If still need qty (unplanned or plan exhausted), default to Deepak (Main Store)
      if (qtyToDeduct > 0) {
         deductDeepak += qtyToDeduct; 
      }

      // 2. Update Specific Store Stocks
      let storeEntry = stocks.find(s => s.productId === item.productId);
      if (!storeEntry) {
         // Create if missing (assuming all existing is in Deepak)
         const p = products.find(p => p.id === item.productId);
         storeEntry = { 
           productId: item.productId, 
           deepakStock: p ? p.quantity : 0, 
           dimpleStock: 0, 
           lastUpdated: new Date().toISOString() 
         };
         stocks.push(storeEntry);
      }
      
      storeEntry.deepakStock = Math.max(0, storeEntry.deepakStock - deductDeepak);
      storeEntry.dimpleStock = Math.max(0, storeEntry.dimpleStock - deductDimple);

      // 3. Update Global Product Qty
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.quantity = Math.max(0, prod.quantity - item.quantity);
      }
    });
    
    // Persist all changes
    v2.saveStoreStocks(stocks);
    v2.saveLogisticsPlan(plan);
    saveProducts(products);
  },

  // Reverse operation (if order marked incomplete)
  processOrderReversionStock: (order: Order) => {
    const stocks = v2.getStoreStocks();
    const products = getProducts();

    order.items.forEach(item => {
      if (item.isCustom) return;
      
      // We don't know exactly where it came from, so we default return to Deepak (Main Store)
      // to avoid complicating the logic.
      let storeEntry = stocks.find(s => s.productId === item.productId);
      if (!storeEntry) {
         const p = products.find(p => p.id === item.productId);
         storeEntry = { productId: item.productId, deepakStock: p ? p.quantity : 0, dimpleStock: 0, lastUpdated: new Date().toISOString() };
         stocks.push(storeEntry);
      }
      
      storeEntry.deepakStock += item.quantity;
      
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.quantity += item.quantity;
      }
    });

    v2.saveStoreStocks(stocks);
    saveProducts(products);
  }
};
