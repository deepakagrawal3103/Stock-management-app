export enum OrderStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  ONLINE = 'ONLINE',
  SPLIT = 'SPLIT'
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
  cashAmount: number;
  onlineAmount: number;
  isPaid: boolean;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string; // ISO string
  items: OrderItem[];
  discount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentDetails: PaymentDetails;
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