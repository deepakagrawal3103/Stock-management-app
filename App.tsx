
import React, { useState, useEffect } from 'react';
import { Product, Order, OrderStatus, PaymentStatus, PaymentMethod } from './types';
import * as Storage from './services/storage';
import { Dashboard } from './components/Dashboard';
import { ProductManager } from './components/ProductManager';
import { OrderManager } from './components/OrderManager';
import { RequirementView } from './components/RequirementView';
import { LayoutDashboard, Package, ShoppingCart, ClipboardList, Menu, X } from 'lucide-react';

// Toast Notification Simple Implementation
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
  <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 z-50 flex items-center gap-2 ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
    <span>{message}</span>
    <button onClick={onClose} className="ml-2 hover:opacity-75">✕</button>
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'ORDERS' | 'REQUIREMENT'>('DASHBOARD');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setProducts(Storage.getProducts());
    setOrders(Storage.getOrders());
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Helper: Stock Logic ---
  // Deduct stock for items in an order
  const deductStockForOrder = (currentProducts: Product[], orderItems: any[]): Product[] => {
    return currentProducts.map(p => {
      const orderItem = orderItems.find(item => item.productId === p.id && !item.isCustom);
      if (orderItem) {
        return { ...p, quantity: p.quantity - orderItem.quantity };
      }
      return p;
    });
  };

  // Restore stock (add back)
  const restoreStockForOrder = (currentProducts: Product[], orderItems: any[]): Product[] => {
    return currentProducts.map(p => {
      const orderItem = orderItems.find(item => item.productId === p.id && !item.isCustom);
      if (orderItem) {
        return { ...p, quantity: p.quantity + orderItem.quantity };
      }
      return p;
    });
  };

  // --- Actions ---

  const handleAddProduct = (product: Product) => {
    const updated = [...products, product];
    setProducts(updated);
    Storage.saveProducts(updated);
    showToast('Product added successfully');
  };

  const handleUpdateProduct = (product: Product) => {
    const updated = products.map(p => p.id === product.id ? product : p);
    setProducts(updated);
    Storage.saveProducts(updated);
    showToast('Product updated');
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      Storage.saveProducts(updated);
      showToast('Product deleted');
    }
  };

  const handleSaveOrder = (order: Order, isEdit: boolean) => {
    let updatedProducts = [...products];

    if (isEdit) {
      // 1. Find old order
      const oldOrder = orders.find(o => o.id === order.id);
      if (oldOrder) {
        // 2. Restore stock from old order items
        updatedProducts = restoreStockForOrder(updatedProducts, oldOrder.items);
      }
      // 3. Update Order List
      const updatedOrders = orders.map(o => o.id === order.id ? order : o);
      setOrders(updatedOrders);
      Storage.saveOrders(updatedOrders);
      showToast('Order updated');
    } else {
      // Create New
      const updatedOrders = [order, ...orders];
      setOrders(updatedOrders);
      Storage.saveOrders(updatedOrders);
      showToast('Order created');
    }

    // 4. Deduct stock for new items
    updatedProducts = deductStockForOrder(updatedProducts, order.items);
    
    setProducts(updatedProducts);
    Storage.saveProducts(updatedProducts);
    setActiveTab('ORDERS');
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, paymentDetails?: any, note?: string) => {
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        let updates: Partial<Order> = { status };
        
        if (note) {
          updates.note = note;
        }

        if (status === OrderStatus.COMPLETED && paymentDetails) {
          updates.paymentDetails = {
            method: paymentDetails.method,
            cashAmount: paymentDetails.method === PaymentMethod.CASH ? paymentDetails.amountPaid : 0,
            onlineAmount: paymentDetails.method === PaymentMethod.ONLINE ? paymentDetails.amountPaid : 0,
            totalPaid: paymentDetails.amountPaid,
            status: paymentDetails.status
          };
        }
        return { ...o, ...updates };
      }
      return o;
    });
    setOrders(updatedOrders);
    Storage.saveOrders(updatedOrders);
    showToast(`Order updated: ${status}`);
  };

  const handleDeleteOrder = (id: string) => {
    if (confirm('Delete this order? Stock will be restored.')) {
      const order = orders.find(o => o.id === id);
      if (order) {
         // Restore stock
         const updatedProducts = restoreStockForOrder(products, order.items);
         setProducts(updatedProducts);
         Storage.saveProducts(updatedProducts);

         // Remove order
         const updatedOrders = orders.filter(o => o.id !== id);
         setOrders(updatedOrders);
         Storage.saveOrders(updatedOrders);
         showToast('Order deleted');
      }
    }
  };

  // --- Layout Helpers ---
  const NavItem = ({ tab, icon: Icon, label }: { tab: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }}
      className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors w-full md:w-auto
        ${activeTab === tab ? 'bg-brand-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}
      `}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-brand-600 text-white p-2 rounded-lg mr-3">
                 <ClipboardList className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Print Bazar <span className="text-brand-600">Manager</span></h1>
            </div>
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-2">
              <NavItem tab="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
              <NavItem tab="ORDERS" icon={ShoppingCart} label="Orders" />
              <NavItem tab="REQUIREMENT" icon={ClipboardList} label="Needs" />
              <NavItem tab="PRODUCTS" icon={Package} label="Stock" />
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        
        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
              <NavItem tab="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
              <NavItem tab="ORDERS" icon={ShoppingCart} label="Orders" />
              <NavItem tab="REQUIREMENT" icon={ClipboardList} label="Needs" />
              <NavItem tab="PRODUCTS" icon={Package} label="Stock" />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'DASHBOARD' && <Dashboard orders={orders} />}
          
          {activeTab === 'PRODUCTS' && (
            <ProductManager 
              products={products}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {activeTab === 'ORDERS' && (
            <OrderManager 
              orders={orders}
              products={products}
              onSaveOrder={handleSaveOrder}
              onUpdateStatus={handleUpdateOrderStatus}
              onDeleteOrder={handleDeleteOrder}
            />
          )}

          {activeTab === 'REQUIREMENT' && (
            <RequirementView products={products} orders={orders} />
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;
