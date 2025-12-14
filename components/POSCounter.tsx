
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Order, OrderStatus, PaymentStatus, PaymentMethod, OrderItem } from '../types';
import { Button, Input, Textarea } from './ui/Common';
import { Search, ShoppingCart, Plus, Minus, Trash2, Save, X, Tag, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface POSCounterProps {
  products: Product[];
  initialOrder?: Order | null;
  onSaveOrder: (order: Order) => void;
  onCancel: () => void;
}

interface TempItem {
  id: string; 
  type: 'STOCK' | 'CUSTOM';
  name: string;
  quantity: number;
  cost: number;
  price: number;
  isCustom: boolean;
  maxStock?: number;
}

export const POSCounter: React.FC<POSCounterProps> = ({ products, initialOrder, onSaveOrder, onCancel }) => {
  const [items, setItems] = useState<TempItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'CART'>('PRODUCTS');

  useEffect(() => {
    if (initialOrder) {
      setCustomerName(initialOrder.customerName);
      setCustomerPhone(initialOrder.customerPhone);
      setDiscount(initialOrder.discount);
      setNote(initialOrder.note || '');
      
      const mappedItems: TempItem[] = initialOrder.items.map(i => {
        const product = products.find(p => p.id === i.productId);
        return {
          id: i.productId,
          type: i.isCustom ? 'CUSTOM' : 'STOCK',
          name: i.productName,
          quantity: i.quantity,
          cost: i.costPriceSnapshot,
          price: i.sellingPriceSnapshot,
          isCustom: !!i.isCustom,
          maxStock: product ? product.quantity + i.quantity : i.quantity // Allow existing ordered qty + current stock
        };
      });
      setItems(mappedItems);
    }
  }, [initialOrder, products]);

  const cartQuantities = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(item => {
      if (!item.isCustom) {
        map.set(item.id, item.quantity);
      }
    });
    return map;
  }, [items]);

  const addToCart = (product: Product) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(i => i.id === product.id && !i.isCustom);
      
      if (existingIndex >= 0) {
        const newItems = [...prev];
        newItems[existingIndex] = { ...newItems[existingIndex], quantity: newItems[existingIndex].quantity + 1 };
        return newItems;
      }
      return [...prev, {
        id: product.id,
        type: 'STOCK',
        name: product.name,
        quantity: 1,
        cost: product.costPrice,
        price: product.sellingPrice,
        isCustom: false,
        maxStock: product.quantity
      }];
    });
  };

  const addCustomItem = () => {
    const id = `custom-${crypto.randomUUID()}`;
    setItems([...items, { id, type: 'CUSTOM', name: 'Custom Print', quantity: 1, cost: 0, price: 0, isCustom: true }]);
    setActiveTab('CART');
  };

  const updateItem = (index: number, changes: Partial<TempItem>) => {
    const newItems = [...items];
    const item = newItems[index];
    
    newItems[index] = { ...item, ...changes };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = (currentItems = items) => {
    const subtotal = currentItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return Math.max(0, subtotal - discount);
  };

  const handleSave = () => {
    const validItems = items.filter(i => i.quantity > 0 && i.price > 0);
    if (validItems.length === 0) {
      alert("Please add at least one valid item with a price greater than 0.");
      return;
    }
    const orderItems: OrderItem[] = validItems.map(i => ({
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
      completedAt: initialOrder?.completedAt,
      items: orderItems,
      discount,
      totalAmount: calculateTotal(validItems),
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

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['ALL', ...Array.from(cats).sort()];
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cartItemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotal = calculateTotal();

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] relative">
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-2xl shadow-soft border border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="sm" onClick={onCancel} icon={X} className="bg-gray-100 hover:bg-gray-200">Close</Button>
           <h2 className="text-lg font-bold text-gray-900 hidden sm:block">{initialOrder ? 'Edit Order' : 'New Order'}</h2>
        </div>
        <div className="flex md:hidden bg-gray-100 rounded-lg p-1">
          <button 
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'PRODUCTS' ? 'bg-white shadow text-brand-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('PRODUCTS')}
          >
            Items
          </button>
          <button 
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'CART' ? 'bg-white shadow text-brand-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('CART')}
          >
            Cart ({cartItemCount})
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden relative">
        {/* Product Grid */}
        <div className={`flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden ${activeTab === 'CART' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3 shrink-0">
             <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search items..." 
                      className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 transition-all"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button size="sm" variant="secondary" onClick={addCustomItem} icon={Plus}>Custom</Button>
             </div>
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat 
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' 
                        : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {cat === 'ALL' ? 'All' : cat}
                  </button>
                ))}
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30 pb-24 md:pb-4">
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map(product => {
                  const isLowStock = product.quantity <= product.minStock;
                  const quantityInCart = cartQuantities.get(product.id) || 0;
                  const isExceeding = quantityInCart > product.quantity;

                  return (
                    <div 
                      key={product.id} 
                      onClick={() => addToCart(product)}
                      className={`cursor-pointer bg-white rounded-xl p-3 flex flex-col justify-between h-36 relative border transition-all hover:translate-y-[-2px] hover:shadow-md
                        ${quantityInCart > 0 ? 'border-brand-500 ring-1 ring-brand-500 shadow-lg shadow-brand-500/10' : 'border-gray-200 shadow-sm'}`}
                    >
                      {quantityInCart > 0 && (
                        <div className={`absolute -top-2 -right-2 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-lg z-10 ${isExceeding ? 'bg-amber-500' : 'bg-brand-600'}`}>
                          {quantityInCart}
                        </div>
                      )}
                      
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <Tag className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide truncate">{product.category}</span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{product.name}</h4>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-end">
                          <span className="text-lg font-bold text-gray-900">₹{product.sellingPrice}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${product.quantity <= 0 ? 'bg-red-100 text-red-700' : isLowStock ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                            {product.quantity <= 0 ? '0 Stock' : `${product.quantity} left`}
                          </span>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        </div>

        {activeTab === 'PRODUCTS' && items.length > 0 && (
          <div className="md:hidden fixed bottom-20 left-4 right-4 z-30 animate-[slideUp_0.3s_ease-out_forwards]">
            <button 
              onClick={() => setActiveTab('CART')}
              className="w-full bg-gray-900 text-white rounded-2xl shadow-xl shadow-gray-900/30 p-4 flex justify-between items-center"
            >
              <div className="flex flex-col items-start">
                <span className="text-gray-400 text-xs font-bold uppercase">{cartItemCount} Items</span>
                <span className="text-xl font-bold">₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-sm font-bold">
                View Cart <ChevronUp className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}

        {/* Cart */}
        <div className={`w-full md:w-96 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden ${activeTab === 'PRODUCTS' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Cart
            </h3>
            {items.length > 0 && (
              <button onClick={() => setItems([])} className="text-xs font-bold text-red-500 hover:text-red-700">Clear</button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
               <Input placeholder="Customer Name" className="bg-white" value={customerName} onChange={e => setCustomerName(e.target.value)} />
               <Input placeholder="Phone" className="bg-white" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
            </div>

            {items.length === 0 ? (
               <div className="text-center text-gray-400 py-12">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShoppingCart className="w-8 h-8 text-gray-300" />
                 </div>
                 <p className="text-sm font-medium">Cart is empty</p>
               </div>
            ) : (
               <div>
                 {items.map((item, idx) => {
                   const isExceeding = !item.isCustom && item.maxStock !== undefined && item.quantity > item.maxStock;
                   
                   return (
                     <div key={idx} className="border border-gray-100 rounded-xl p-3 relative bg-white shadow-sm mb-2">
                        <div className="flex justify-between items-start pr-8 mb-2">
                          {item.isCustom ? (
                            <input 
                              className="font-bold text-sm border-b border-dashed border-gray-300 focus:border-brand-500 outline-none w-full"
                              value={item.name}
                              onChange={e => updateItem(idx, { name: e.target.value })}
                              placeholder="Item Name"
                              autoFocus
                            />
                          ) : (
                            <span className="font-bold text-sm text-gray-900">{item.name}</span>
                          )}
                          <button onClick={() => removeItem(idx)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors">
                             <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                           <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-8">
                             <button className="w-8 h-full hover:bg-gray-200 rounded-l-lg transition-colors text-gray-600" onClick={() => updateItem(idx, { quantity: Math.max(1, item.quantity - 1) })}><Minus className="w-3 h-3 mx-auto"/></button>
                             <span className="w-8 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                             <button 
                                className="w-8 h-full rounded-r-lg transition-colors text-gray-600 hover:bg-gray-200" 
                                onClick={() => updateItem(idx, { quantity: item.quantity + 1 })}
                              >
                                <Plus className="w-3 h-3 mx-auto"/>
                             </button>
                           </div>
                           <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400 font-bold">₹</span>
                              <input 
                                type="number"
                                className="w-16 text-right text-sm font-bold border-b border-transparent focus:border-brand-500 outline-none bg-transparent"
                                value={item.price}
                                onChange={e => updateItem(idx, { price: parseFloat(e.target.value) || 0 })}
                              />
                           </div>
                        </div>
                        {isExceeding && (
                          <div className="flex items-start gap-1.5 mt-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
                             <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                             <p className="text-[10px] text-blue-700 leading-tight font-medium">
                               Stock insufficient. Item will be added to production "Needs" list.
                             </p>
                          </div>
                        )}
                     </div>
                   );
                 })}
               </div>
            )}

            <div className="pt-2">
              <Textarea 
                placeholder="Order notes..." 
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                className="text-sm bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-white space-y-3 shadow-up shrink-0">
             <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Subtotal</span>
                <span className="font-bold">₹{items.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Discount</span>
                <input 
                  type="number" 
                  className="w-20 text-right border rounded-lg px-2 py-1 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium"
                  value={discount}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                />
             </div>
             <div className="flex justify-between items-center text-xl font-bold text-gray-900 pt-3 border-t border-gray-100">
                <span>Total</span>
                <span className="text-brand-600">₹{cartTotal.toFixed(2)}</span>
             </div>
             
             <Button className="w-full h-12 text-lg shadow-xl shadow-brand-500/30" size="lg" icon={Save} onClick={handleSave}>
               {initialOrder ? 'Update Order' : 'List Order'}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
