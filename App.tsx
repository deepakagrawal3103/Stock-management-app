
import React, { useState, useEffect } from 'react';
import { Product, Order, OrderStatus, PaymentStatus, PaymentMethod } from './types';
import * as Storage from './services/storage';
import { Dashboard } from './components/Dashboard';
import { ProductManager } from './components/ProductManager';
import { OrderManager } from './components/OrderManager';
import { RequirementView } from './components/RequirementView'; 
import { UnpaidWritingsManager } from './components/UnpaidWritingsManager'; 
import { VoiceAssistant } from './components/VoiceAssistant';
import { AdvancedSearch } from './components/AdvancedSearch';
import { PendingOrdersPage } from './components/PendingOrdersPage'; 

import { LayoutDashboard, Package, ShoppingCart, ClipboardList, Printer, Search, Book } from 'lucide-react';

// Toast Notification
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
  <div 
    className={`fixed bottom-24 md:bottom-8 right-4 px-6 py-3 rounded-2xl shadow-2xl text-white z-[80] flex items-center gap-3 font-medium backdrop-blur-md ${type === 'success' ? 'bg-slate-900/90 shadow-slate-900/20' : 'bg-red-500/90 shadow-red-500/20'}`}
  >
    <span>{message}</span>
    <button onClick={onClose} className="hover:opacity-75">✕</button>
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'ORDERS' | 'NEEDS' | 'RECORDS' | 'PENDING_PAGE'>('DASHBOARD');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [products, setProducts] = useState<Product[]>(() => Storage.getProducts() || []);
  const [orders, setOrders] = useState<Order[]>(() => Storage.getOrders() || []);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshProducts = () => {
    setProducts(Storage.getProducts());
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
    { id: 'PRODUCTS', icon: Package, label: 'Stock' },
    { id: 'NEEDS', icon: ClipboardList, label: 'Needs' },
    { id: 'RECORDS', icon: Book, label: 'Records' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-28 md:pb-10 font-sans text-slate-900 selection:bg-brand-100 selection:text-brand-900">
      
      {/* Header (Desktop & Mobile) */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 transition-all supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-brand-500 to-indigo-600 p-2 rounded-xl shadow-lg shadow-brand-500/20 ring-1 ring-white/50">
                 <Printer className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-slate-900 leading-none tracking-tight">Print Bazar</h1>
                <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mt-0.5">Manager</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-xl transition-colors md:mr-4 active:scale-95"
                >
                  <Search className="w-5 h-5" />
                </button>
                
                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
                  {navItems.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)} 
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                        activeTab === item.id 
                          ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full">
            {activeTab === 'DASHBOARD' && (
              <Dashboard 
                orders={orders} 
                onNavigate={(page) => setActiveTab(page as any)} 
              />
            )}
            
            {activeTab === 'ORDERS' && (
              <OrderManager 
                orders={orders} 
                products={products} 
                onSaveOrder={handleSaveOrder} 
                onUpdateStatus={handleUpdateStatus}
                onDeleteOrder={handleDeleteOrder}
              />
            )}
            
            {activeTab === 'PENDING_PAGE' && (
              <PendingOrdersPage orders={orders} onBack={() => setActiveTab('DASHBOARD')} />
            )}

            {activeTab === 'PRODUCTS' && (
              <ProductManager 
                products={products} 
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onRefresh={refreshProducts}
              />
            )}

            {activeTab === 'NEEDS' && (
              <RequirementView products={products} orders={orders} />
            )}

            {activeTab === 'RECORDS' && (
              <UnpaidWritingsManager orders={orders} products={products} />
            )}
        </div>
      </main>

      {/* Mobile Footer Navigation - Glassmorphism */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 z-50 pb-safe shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="flex items-center h-[72px] px-4 justify-between w-full max-w-lg mx-auto">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)} 
              className="relative flex flex-col items-center justify-center flex-1 h-full space-y-1.5 group active:scale-95 transition-transform"
            >
              <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${activeTab === item.id ? 'bg-brand-50 text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                {activeTab === item.id && (
                   <div className="absolute inset-0 bg-brand-50 rounded-xl -z-10" />
                )}
                <item.icon className={`w-5 h-5 transition-transform ${activeTab === item.id ? 'scale-110' : ''}`} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold tracking-tight transition-colors duration-200 ${activeTab === item.id ? 'text-brand-600' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <AdvancedSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        orders={orders} 
        products={products}
        roughWork={Storage.getRoughWork()}
      />

      <VoiceAssistant />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default App;
