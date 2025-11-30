import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, Product, OrderItem } from '../types';
import { Button, Card, Input, Modal, Badge } from './ui/Common';
import { Plus, Trash2, CheckCircle, Truck, Search, FileText, Box } from 'lucide-react';

interface OrderManagerProps {
  orders: Order[];
  products: Product[];
  onAddOrder: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus, payment?: { cash: number, online: number }) => void;
  onDeleteOrder: (id: string) => void;
}

// Temporary type for form handling
interface TempItem {
  type: 'STOCK' | 'CUSTOM';
  productId?: string;
  customName?: string;
  quantity: number;
  customCost?: number;
  customPrice?: number;
}

export const OrderManager: React.FC<OrderManagerProps> = ({ orders, products, onAddOrder, onUpdateStatus, onDeleteOrder }) => {
  const [view, setView] = useState<'ALL' | 'PENDING' | 'DELIVERED' | 'COMPLETED'>('PENDING');
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [paymentData, setPaymentData] = useState({ cash: 0, online: 0 });

  const [newOrder, setNewOrder] = useState<{
    customerName: string;
    customerPhone: string;
    items: TempItem[];
    discount: number;
  }>({
    customerName: '',
    customerPhone: '',
    items: [],
    discount: 0
  });

  const addItemToOrder = (type: 'STOCK' | 'CUSTOM') => {
    let newItem: TempItem;
    
    if (type === 'STOCK') {
      if (products.length === 0) return alert('No products in stock.');
      newItem = { type: 'STOCK', productId: products[0].id, quantity: 1 };
    } else {
      newItem = { type: 'CUSTOM', customName: '', quantity: 1, customCost: 0, customPrice: 0 };
    }

    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, newItem]
    });
  };

  const removeItemFromOrder = (index: number) => {
    const updated = [...newOrder.items];
    updated.splice(index, 1);
    setNewOrder({ ...newOrder, items: updated });
  };

  const updateItem = (index: number, field: keyof TempItem, value: any) => {
    const updated = [...newOrder.items];
    updated[index] = { ...updated[index], [field]: value };
    setNewOrder({ ...newOrder, items: updated });
  };

  const calculateTotal = () => {
    const subtotal = newOrder.items.reduce((acc, item) => {
      if (item.type === 'STOCK' && item.productId) {
        const p = products.find(prod => prod.id === item.productId);
        return acc + (p ? p.sellingPrice * item.quantity : 0);
      } else {
        return acc + ((item.customPrice || 0) * item.quantity);
      }
    }, 0);
    return Math.max(0, subtotal - newOrder.discount);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOrder.items.length === 0) return;

    // Validate Custom Items
    const invalidCustom = newOrder.items.find(i => i.type === 'CUSTOM' && (!i.customName || !i.customPrice));
    if (invalidCustom) {
      alert("Please fill in Name and Price for all custom items.");
      return;
    }

    const fullItems: OrderItem[] = newOrder.items.map(item => {
      if (item.type === 'STOCK' && item.productId) {
        const p = products.find(prod => prod.id === item.productId)!;
        return {
          productId: p.id,
          productName: p.name,
          quantity: item.quantity,
          costPriceSnapshot: p.costPrice,
          sellingPriceSnapshot: p.sellingPrice,
          isCustom: false
        };
      } else {
        return {
          productId: `custom-${crypto.randomUUID()}`,
          productName: item.customName || 'Custom Item',
          quantity: item.quantity,
          costPriceSnapshot: item.customCost || 0,
          sellingPriceSnapshot: item.customPrice || 0,
          isCustom: true
        };
      }
    });

    const order: Order = {
      id: crypto.randomUUID(),
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      date: new Date().toISOString(),
      items: fullItems,
      discount: newOrder.discount,
      totalAmount: calculateTotal(),
      status: OrderStatus.PENDING,
      paymentDetails: { cashAmount: 0, onlineAmount: 0, isPaid: false }
    };

    onAddOrder(order);
    setIsNewOrderOpen(false);
    setNewOrder({ customerName: '', customerPhone: '', items: [], discount: 0 });
  };

  const handleCompleteOrder = () => {
    if (!selectedOrderId) return;
    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return;

    const enteredTotal = (paymentData.cash || 0) + (paymentData.online || 0);
    // Floating point comparison
    if (Math.abs(enteredTotal - order.totalAmount) > 0.1) {
      alert(`Payment must match total! (Diff: ₹${(order.totalAmount - enteredTotal).toFixed(2)})`);
      return;
    }

    onUpdateStatus(selectedOrderId, OrderStatus.COMPLETED, paymentData);
    setIsPaymentOpen(false);
    setSelectedOrderId(null);
    setPaymentData({ cash: 0, online: 0 });
  };

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (view !== 'ALL') {
      list = list.filter(o => o.status === view);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(o => 
        o.customerName.toLowerCase().includes(term) || 
        o.id.slice(0, 8).includes(term)
      );
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, view, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {(['ALL', 'PENDING', 'DELIVERED', 'COMPLETED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setView(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                view === status 
                  ? 'bg-brand-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status} <span className="opacity-75 text-xs ml-1">{status !== 'ALL' ? `(${orders.filter(o => o.status === status).length})` : ''}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
             <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
             <input 
                type="text" 
                placeholder="Search..." 
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
          <Button onClick={() => { addItemToOrder('STOCK'); setIsNewOrderOpen(true); }} icon={Plus} className="whitespace-nowrap">
            New
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredOrders.map(order => (
          <Card key={order.id} className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:shadow-md transition-shadow">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-xs text-gray-400">#{order.id.slice(0, 6)}</span>
                <span className="text-xs text-gray-300">|</span>
                <span className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</span>
                <Badge color={
                  order.status === 'COMPLETED' ? 'green' : 
                  order.status === 'DELIVERED' ? 'blue' : 'yellow'
                }>{order.status}</Badge>
              </div>
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{order.customerName}</h3>
                    <p className="text-sm text-gray-500">{order.customerPhone}</p>
                 </div>
                 <div className="text-right md:hidden">
                    <div className="font-bold text-lg text-brand-700">₹{order.totalAmount.toFixed(0)}</div>
                 </div>
              </div>
              
              <div className="mt-3 bg-gray-50 p-2 rounded-lg text-sm space-y-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between w-full">
                    <span className="text-gray-700 flex items-center gap-1">
                       {item.isCustom ? <FileText className="w-3 h-3 text-indigo-500"/> : <Box className="w-3 h-3 text-gray-500"/>}
                       <span className="font-medium">{item.quantity}x</span> {item.productName}
                    </span>
                    <span className="text-gray-500">₹{(item.quantity * item.sellingPriceSnapshot).toFixed(2)}</span>
                  </div>
                ))}
                {order.discount > 0 && (
                   <div className="flex justify-between w-full text-red-500 border-t border-gray-200 pt-1 mt-1">
                     <span>Discount</span>
                     <span>-₹{order.discount}</span>
                   </div>
                )}
              </div>
              <div className="hidden md:block font-bold text-lg mt-2 text-brand-700">Total: ₹{order.totalAmount.toFixed(2)}</div>
            </div>

            <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto mt-2 md:mt-0 border-t md:border-t-0 pt-3 md:pt-0">
              {order.status === OrderStatus.PENDING && (
                <Button className="flex-1 md:flex-none" size="sm" variant="secondary" icon={Truck} onClick={() => onUpdateStatus(order.id, OrderStatus.DELIVERED)}>
                  Deliver
                </Button>
              )}
              {order.status === OrderStatus.DELIVERED && (
                <Button className="flex-1 md:flex-none" size="sm" variant="success" icon={CheckCircle} onClick={() => {
                  setSelectedOrderId(order.id);
                  setPaymentData({ cash: order.totalAmount, online: 0 });
                  setIsPaymentOpen(true);
                }}>
                  Complete
                </Button>
              )}
              {order.status !== OrderStatus.COMPLETED && (
                <Button className="flex-1 md:flex-none" size="sm" variant="outline" icon={Trash2} onClick={() => onDeleteOrder(order.id)}>
                  Delete
                </Button>
              )}
            </div>
          </Card>
        ))}
        {filteredOrders.length === 0 && (
           <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
             <div className="p-4 bg-gray-50 rounded-full mb-3">
                <Search className="w-6 h-6 text-gray-400" />
             </div>
             <p>No orders found in this view.</p>
           </div>
        )}
      </div>

      {/* New Order Modal */}
      <Modal isOpen={isNewOrderOpen} onClose={() => setIsNewOrderOpen(false)} title="Create New Order">
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer Name" required value={newOrder.customerName} onChange={e => setNewOrder({...newOrder, customerName: e.target.value})} />
            <Input label="Phone" type="tel" value={newOrder.customerPhone} onChange={e => setNewOrder({...newOrder, customerPhone: e.target.value})} />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-end">
               <label className="block text-sm font-medium text-gray-700">Order Items</label>
               <div className="flex gap-2">
                 <button type="button" onClick={() => addItemToOrder('STOCK')} className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded hover:bg-brand-100 border border-brand-200">
                    + Product
                 </button>
                 <button type="button" onClick={() => addItemToOrder('CUSTOM')} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 border border-indigo-200">
                    + Quick Print
                 </button>
               </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {newOrder.items.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Add items to the order</p>}
              
              {newOrder.items.map((item, idx) => (
                <div key={idx} className={`p-3 rounded-lg border relative ${item.type === 'CUSTOM' ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-200'}`}>
                  <button type="button" onClick={() => removeItemFromOrder(idx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  
                  {item.type === 'STOCK' ? (
                    // Stock Item Row
                    <div className="flex gap-2 items-end pr-6">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Stock Product</label>
                        <select 
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-1.5 border"
                          value={item.productId}
                          onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (₹{p.sellingPrice})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-20">
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Qty</label>
                        <input 
                          type="number" 
                          min="1" 
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-1.5 border"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  ) : (
                    // Custom Item Row
                    <div className="space-y-2 pr-6">
                       <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase text-indigo-500 font-bold">Description (e.g. 50 Pages)</label>
                            <input 
                              type="text" 
                              placeholder="Item Name"
                              className="block w-full rounded-md border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1.5 border"
                              value={item.customName}
                              onChange={(e) => updateItem(idx, 'customName', e.target.value)}
                            />
                          </div>
                          <div className="w-20">
                            <label className="text-[10px] uppercase text-indigo-500 font-bold">Qty</label>
                            <input 
                              type="number" 
                              min="1" 
                              className="block w-full rounded-md border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1.5 border"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value))}
                            />
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase text-gray-500 font-bold">Cost/Unit (₹)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 text-sm p-1.5 border"
                              value={item.customCost || ''}
                              onChange={(e) => updateItem(idx, 'customCost', parseFloat(e.target.value))}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] uppercase text-gray-500 font-bold">Sell/Unit (₹)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 text-sm p-1.5 border"
                              value={item.customPrice || ''}
                              onChange={(e) => updateItem(idx, 'customPrice', parseFloat(e.target.value))}
                            />
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
             <div className="w-1/3">
               <Input label="Discount" type="number" value={newOrder.discount} onChange={e => setNewOrder({...newOrder, discount: parseFloat(e.target.value)})} />
             </div>
             <div className="text-right">
               <span className="text-gray-500 text-sm">Total:</span>
               <div className="text-2xl font-bold text-brand-600">₹{calculateTotal().toFixed(2)}</div>
             </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsNewOrderOpen(false)}>Cancel</Button>
            <Button type="submit">Create Order</Button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Complete Order">
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg text-blue-800 text-center font-bold text-lg">
            Due: ₹{selectedOrderId ? orders.find(o => o.id === selectedOrderId)?.totalAmount.toFixed(2) : 0}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <Input 
              label="Cash Received" 
              type="number" 
              value={paymentData.cash} 
              onFocus={(e) => e.target.select()}
              onChange={e => setPaymentData({...paymentData, cash: parseFloat(e.target.value) || 0})} 
             />
             <Input 
              label="Online (UPI)" 
              type="number" 
              value={paymentData.online} 
              onFocus={(e) => e.target.select()}
              onChange={e => setPaymentData({...paymentData, online: parseFloat(e.target.value) || 0})} 
             />
          </div>

          <div className="text-sm text-gray-500 text-center">
            Entered: <span className={(paymentData.cash + paymentData.online).toFixed(2) === (selectedOrderId ? orders.find(o => o.id === selectedOrderId)?.totalAmount.toFixed(2) : '0.00') ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
              ₹{(paymentData.cash + paymentData.online).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-4">
             <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
             <Button type="button" variant="success" onClick={handleCompleteOrder}>Mark Completed</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};