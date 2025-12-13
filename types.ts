
export enum OrderStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  ONLINE = 'ONLINE',
  SPLIT = 'SPLIT',
  NONE = 'NONE'
}

export enum PaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL'
}

export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  minStock: number;
}

export interface OrderItem {
  productId: string; // If custom, this can be a generated ID
  productName: string;
  quantity: number;
  costPriceSnapshot: number;
  sellingPriceSnapshot: number;
  isCustom?: boolean; // Flag to identify if it's a Quick Print/Page order
}

export interface PaymentDetails {
  method: PaymentMethod;
  cashAmount: number;
  onlineAmount: number;
  totalPaid: number;
  status: PaymentStatus;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string; // ISO string (Creation Date)
  completedAt?: string; // ISO string (Completion Date)
  items: OrderItem[];
  discount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentDetails: PaymentDetails;
  note?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string
  category?: string; 
}

export interface DailyStats {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  completedOrders: number;
  revenueCash: number;
  revenueOnline: number;
  totalRevenue: number;
  totalProfit: number;
}

// AI Assistant Types
export interface AIAction {
  intent: string;
  parameters?: Record<string, any>;
  item?: string;
  quantity?: number;
}

export interface AIResponse {
  voiceResponse: string;
  actionJSON: AIAction;
}

// --- V2 ADDITIONS ---

export interface UnpaidWriting {
  id: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  relatedOrderId?: string;
  createdAt: string;
  status: 'UNPAID' | 'PAID';
}

export interface PartialPayment {
  id: string;
  orderId: string;
  amount: number;
  method: 'ONLINE' | 'CASH';
  reference?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string; // Hex code or tailwind class name reference
}

export interface OrderCategoryMap {
  orderId: string;
  categoryId: string;
}

// --- NEW V2 MODULES (ADDITIVE) ---

export type StoreHouseName = 'Deepak' | 'Dimple';

export interface StoreStock {
  productId: string;
  deepakStock: number; // Dewas
  dimpleStock: number; // Indore
  lastUpdated: string;
}

export interface ManualNeed {
  id: string;
  productId: string;
  totalRequired: number;
  note: string;
  createdAt: string;
}
