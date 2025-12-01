
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Order, OrderStatus, PaymentStatus, PaymentMethod, OrderItem } from '../types';
import { Button, Input, Textarea, Badge } from './ui/Common';
import { Search, ShoppingCart, Plus, Minus, Trash2, Save, X, Tag } from 'lucide-react';

interface POSCounterProps {
  products: Product[];
  initialOrder?: Order | null;
  onSaveOrder: (order: Order) => void;
  onCancel: () => void;
}

// Temporary type for form handling
interface TempItem {
  id: string; // either product ID or random for custom
  type: 'STOCK' | 'CUSTOM';
  name: string;
  quantity: number;
  cost: number;
  price: number;
  isCustom: boolean;
}

export const POSCounter: React.FC<POSCounterProps> = ({ products, initialOrder, onSaveOrder, onCancel }) => {
  const [items, setItems] = useState<TempItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'CART'>('PRODUCTS'); // For mobile

  // Load initial data if editing
  useEffect(() => {
    if (initialOrder) {
      setCustomerName(initialOrder.customerName);
      setCustomerPhone(initialOrder.customerPhone);
      setDiscount(initialOrder.discount);
      setNote(initialOrder.note || '');
      
      const mappedItems: TempItem[] = initialOrder.items.map(i => ({
        id: i.productId,
        type: i.isCustom ? 'CUSTOM' : 'STOCK',
        name: i.productName,
        quantity: i.quantity,
        cost: i.costPriceSnapshot,
        price: i.sellingPriceSnapshot,
        isCustom: !!i.isCustom
      }));
      setItems(mappedItems);
    }
  }, [initialOrder]);

  const addToCart = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id && !i.isCustom);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: product.id,
        type: 'STOCK',
        name: product.name,
        quantity: 1,
        cost: product.costPrice,
        price: product.sellingPrice,
        isCustom: false
      }];
    });
  };

  const addCustomItem = () => {
    const id = `custom-${crypto.randomUUID()}`;
    setItems([...items, {
      id,
      type: 'CUSTOM',
      name: 'Custom Print',
      quantity: 1,
      cost: 0,
      price: 0,
      isCustom: true
    }]);
    setActiveTab('CART'); // Switch to cart to edit details
  };

  const updateItem = (index: number, changes: Partial<TempItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...changes };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return Math.max(0, subtotal - discount);
  };

  const handleSave = () => {
    if (items.length === 0) {
      alert("Cart is empty");
      return;
    }

    const orderItems: OrderItem[] = items.map(i => ({
      productId: i.id,
      productName: i.name,
      quantity: i.quantity,
      costPriceSnapshot: i.cost,
      sellingPriceSnapshot: i.price,
      isCustom: i.isCustom
    }));

    const order: Order = {
      id: initialOrder ? initialOrder.id : crypto.randomUUID(),
      customerName,
      customerPhone,
      date: initialOrder ? initialOrder.date : new Date().toISOString(),
      items: orderItems,
      discount,
      totalAmount: calculateTotal(),
      status: initialOrder ? initialOrder.status : OrderStatus.PENDING,
      paymentDetails: initialOrder ? initialOrder.paymentDetails : {
        method: PaymentMethod.NONE,
        cashAmount: 0,
        onlineAmount: 0,
        totalPaid: 0,
        status: PaymentStatus.UNPAID
      },
      note
    };

    onSaveOrder(order);
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['ALL', ...Array.from(cats).sort()];
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl shadow-sm border">
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={onCancel} icon={X}>Close</Button>
           <h2 className="text-lg font-bold text-gray-900 hidden sm:block">{initialOrder ? 'Edit Order' : 'New Order'}</h2>
        </div>
        
        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden bg-gray-100 rounded-lg p-1">
          <button 
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'PRODUCTS' ? 'bg-white shadow text-brand-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('PRODUCTS')}
          >
            Items
          </button>
          <button 
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'CART' ? 'bg-white shadow text-brand-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('CART')}
          >
            Cart ({items.length})
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden relative">
        {/* Left Side: Product Grid */}
        <div className={`flex-1 flex flex-col bg-white rounded-xl border shadow-sm overflow-hidden ${activeTab === 'CART' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b bg-gray-50 space-y-3">
             <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search items..." 
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button size="sm" variant="secondary" onClick={addCustomItem} icon={Plus}>Custom Item</Button>
             </div>

             {/* Category Chips */}
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                      selectedCategory === cat 
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Items' : cat}
                  </button>
                ))}
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-20 md:pb-0">
                {filteredProducts.map(product => {
                  const isLowStock = product.quantity <= product.minStock;
                  return (
                    <div 
                      key={product.id} 
                      onClick={() => addToCart(product)}
                      className="group cursor-pointer bg-white rounded-xl border border-gray-200 p-3 hover:border-brand-500 hover:shadow-lg transition-all flex flex-col justify-between h-36 relative overflow-hidden"
                    >
                      {/* Hover Add Icon */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-brand-50 text-brand-600 rounded-full p-1.5">
                          <Plus className="w-3 h-3" />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <Tag className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">{product.category}</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{product.name}</h4>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-end">
                          <span className="text-lg font-bold text-brand-700">₹{product.sellingPrice}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isLowStock ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            {product.quantity} left
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
             </div>
             {filteredProducts.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Search className="w-8 h-8 mb-2 opacity-50" />
                  <p>No items found</p>
                </div>
             )}
          </div>
        </div>

        {/* Right Side: Counter / Cart */}
        <div className={`w-full md:w-96 flex flex-col bg-white rounded-xl border shadow-sm overflow-hidden ${activeTab === 'PRODUCTS' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Current Order
            </h3>
            <span className="bg-brand-100 text-brand-800 text-xs font-bold px-2 py-1 rounded-full">{items.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50 p-2 rounded-lg">
               <Input 
                 placeholder="Name" 
                 className="text-sm bg-white"
                 value={customerName}
                 onChange={e => setCustomerName(e.target.value)}
               />
               <Input 
                 placeholder="Phone" 
                 className="text-sm bg-white"
                 value={customerPhone}
                 onChange={e => setCustomerPhone(e.target.value)}
               />
            </div>

            {/* Cart Items */}
            {items.length === 0 ? (
               <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                 <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                    <ShoppingCart className="w-6 h-6 text-gray-300" />
                 </div>
                 <p className="text-sm">Select items from the grid to add them here.</p>
               </div>
            ) : (
               <div className="space-y-3">
                 {items.map((item, idx) => (
                   <div key={idx} className="border rounded-lg p-3 relative bg-white shadow-sm hover:border-gray-300 transition-colors group">
                      <div className="flex justify-between items-start pr-6 mb-2">
                        {item.isCustom ? (
                          <input 
                            className="font-medium text-sm border-b border-dashed border-gray-300 focus:border-brand-500 outline-none w-full bg-transparent"
                            value={item.name}
                            onChange={e => updateItem(idx, { name: e.target.value })}
                            placeholder="Item Name"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-sm text-gray-900">{item.name}</span>
                        )}
                        <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 absolute top-2 right-2 transition-colors">
                           <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                         {/* Quantity Control */}
                         <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-8">
                           <button className="w-8 h-full flex items-center justify-center hover:bg-gray-200 rounded-l-lg transition-colors text-gray-600" onClick={() => updateItem(idx, { quantity: Math.max(1, item.quantity - 1) })}>
                              <Minus className="w-3 h-3"/>
                           </button>
                           <span className="w-8 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                           <button className="w-8 h-full flex items-center justify-center hover:bg-gray-200 rounded-r-lg transition-colors text-gray-600" onClick={() => updateItem(idx, { quantity: item.quantity + 1 })}>
                              <Plus className="w-3 h-3"/>
                           </button>
                         </div>
                         
                         {/* Price Input */}
                         <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">₹</span>
                            <input 
                              type="number"
                              className="w-16 text-right text-sm font-medium border-b border-transparent focus:border-brand-500 outline-none bg-transparent hover:border-gray-300 transition-colors"
                              value={item.price}
                              onChange={e => updateItem(idx, { price: parseFloat(e.target.value) || 0 })}
                            />
                         </div>
                      </div>
                      <div className="text-right text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                        Subtotal: ₹{(item.quantity * item.price).toFixed(2)}
                      </div>
                   </div>
                 ))}
               </div>
            )}

            <div className="pt-2">
              <Textarea 
                placeholder="Add order note..." 
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <div className="p-4 border-t bg-gray-50 space-y-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
             <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₹{items.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Discount (₹)</span>
                <input 
                  type="number" 
                  className="w-20 text-right border rounded px-2 py-1 focus:ring-1 focus:ring-brand-500 outline-none"
                  value={discount}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                />
             </div>
             <div className="flex justify-between items-center text-xl font-bold text-gray-900 pt-3 border-t border-gray-200">
                <span>Total Pay</span>
                <span className="text-brand-700">₹{calculateTotal().toFixed(2)}</span>
             </div>
             
             <Button className="w-full h-12 text-lg shadow-brand-500/20 shadow-lg" size="lg" icon={Save} onClick={handleSave}>
               {initialOrder ? 'Update Order' : 'Checkout & Save'}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
