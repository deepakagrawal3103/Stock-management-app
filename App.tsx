import React, { useState, useEffect } from 'react';
import { Product, Order, OrderStatus, PaymentStatus, PaymentMethod } from './types';
import * as Storage from './services/storage';
import { Dashboard } from './components/Dashboard';
import { ProductManager } from './components/ProductManager';
import { OrderManager } from './components/OrderManager';
import { RequirementView } from './components/RequirementView';
import { RoughWork } from './components/RoughWork';
import { VoiceAssistant } from './components/VoiceAssistant';
import { LayoutDashboard, Package, ShoppingCart, ClipboardList, PenTool, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Toast Notification
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.95 }}
    className={`fixed bottom-24 md:bottom-8 right-4 px-6 py-3 rounded-2xl shadow-xl shadow-gray-200 text-white z-[60] flex items-center gap-3 font-medium ${type === 'success' ? 'bg-gray-900' : 'bg-red-500'}`}
  >
    <span>{message}</span>
    <button onClick={onClose} className="hover:opacity-75">✕</button>
  </motion.div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'ORDERS' | 'REQUIREMENT' | 'NOTES'>('DASHBOARD');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setProducts(Storage.getProducts());
    setOrders(Storage.getOrders());
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
    showToast('Product updated successfully');
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      Storage.saveProducts(updated);
      showToast('Product deleted', 'error');
    }
  };

  const handleSaveOrder = (order: Order, isEdit: boolean = false) => {
    let updatedOrders;
    if (isEdit) {
      const oldOrder = orders.find(o => o.id === order.id);
      if (oldOrder?.status === OrderStatus.COMPLETED) {
         oldOrder.items.forEach(item => {
           if (!item.isCustom) Storage.updateProductStock(item.productId, item.quantity);
         });
         if (order.status === OrderStatus.COMPLETED) {
            order.items.forEach(item => {
              if (!item.isCustom) Storage.updateProductStock(item.productId, -item.quantity);
            });
         }
         setProducts(Storage.getProducts());
      }
      updatedOrders = orders.map(o => o.id === order.id ? order : o);
      showToast('Order updated');
    } else {
      updatedOrders = [...orders, order];
      showToast('New order created');
    }
    setOrders(updatedOrders);
    Storage.saveOrders(updatedOrders);
  };

  const handleUpdateStatus = (orderId: string, status: OrderStatus, paymentDetails?: any, note?: string) => {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const order = orders[orderIndex];
    const oldStatus = order.status;
    
    if (status === OrderStatus.COMPLETED && oldStatus !== OrderStatus.COMPLETED) {
       order.items.forEach(item => {
         if (!item.isCustom) Storage.updateProductStock(item.productId, -item.quantity);
       });
       setProducts(Storage.getProducts());
    } else if (oldStatus === OrderStatus.COMPLETED && status !== OrderStatus.COMPLETED) {
       order.items.forEach(item => {
         if (!item.isCustom) Storage.updateProductStock(item.productId, item.quantity);
       });
       setProducts(Storage.getProducts());
    }

    const updatedOrders = [...orders];
    updatedOrders[orderIndex] = { 
      ...order, 
      status,
      completedAt: status === OrderStatus.COMPLETED ? new Date().toISOString() : order.completedAt,
      paymentDetails: paymentDetails || order.paymentDetails,
      note: note !== undefined ? note : order.note
    };

    setOrders(updatedOrders);
    Storage.saveOrders(updatedOrders);
    showToast(`Order marked as ${status}`);
  };

  const handleDeleteOrder = (id: string) => {
    if (confirm('Delete this order?')) {
      const order = orders.find(o => o.id === id);
      if (order?.status === OrderStatus.COMPLETED) {
        order.items.forEach(item => {
           if (!item.isCustom) Storage.updateProductStock(item.productId, item.quantity);
        });
        setProducts(Storage.getProducts());
      }
      const updated = orders.filter(o => o.id !== id);
      setOrders(updated);
      Storage.saveOrders(updated);
      showToast('Order deleted', 'error');
    }
  };

  const navItems = [
    { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Home' },
    { id: 'ORDERS', icon: ShoppingCart, label: 'Orders' },
    { id: 'REQUIREMENT', icon: ClipboardList, label: 'Needs' },
    { id: 'NOTES', icon: PenTool, label: 'Notes' },
    { id: 'PRODUCTS', icon: Package, label: 'Stock' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-28 md:pb-10 font-sans text-gray-900 selection:bg-brand-100 selection:text-brand-900">
      {/* Header (Desktop & Mobile) */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-brand-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-brand-500/20">
                 <Printer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-none tracking-tight">Print Bazar</h1>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Manager</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl">
               {navItems.map(item => (
                 <button 
                   key={item.id}
                   onClick={() => setActiveTab(item.id)} 
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                     activeTab === item.id 
                       ? 'bg-white text-brand-600 shadow-sm' 
                       : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                   }`}
                 >
                   {item.label}
                 </button>
               ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'DASHBOARD' && <Dashboard orders={orders} />}
            
            {activeTab === 'ORDERS' && (
              <OrderManager 
                orders={orders} 
                products={products} 
                onSaveOrder={handleSaveOrder} 
                onUpdateStatus={handleUpdateStatus}
                onDeleteOrder={handleDeleteOrder}
              />
            )}
            
            {activeTab === 'PRODUCTS' && (
              <ProductManager 
                products={products} 
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
              />
            )}

            {activeTab === 'REQUIREMENT' && (
              <RequirementView products={products} orders={orders} />
            )}

            {activeTab === 'NOTES' && (
              <RoughWork />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Footer Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 z-50 pb-safe shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)} 
              className="relative flex flex-col items-center justify-center w-full h-full space-y-1 group"
            >
              {activeTab === item.id && (
                <motion.div 
                  layoutId="navIndicator"
                  className="absolute top-0 w-8 h-1 bg-brand-600 rounded-b-full shadow-[0_0_10px_rgba(2,132,199,0.5)]"
                />
              )}
              <item.icon className={`w-6 h-6 transition-colors duration-200 ${activeTab === item.id ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
              <span className={`text-[10px] font-medium transition-colors duration-200 ${activeTab === item.id ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <VoiceAssistant />

      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;