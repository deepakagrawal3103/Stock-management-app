
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, Product, PaymentStatus, PaymentMethod } from '../types';
import { Button, Card, Input, Modal, Badge, Textarea } from './ui/Common';
import { POSCounter } from './POSCounter';
import { Plus, Trash2, CheckCircle, Truck, Search, FileText, Edit, MoreVertical, AlertTriangle } from 'lucide-react';

interface OrderManagerProps {
  orders: Order[];
  products: Product[];
  onSaveOrder: (order: Order, isEdit: boolean) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus, paymentDetails?: any, note?: string) => void;
  onDeleteOrder: (id: string) => void;
}

export const OrderManager: React.FC<OrderManagerProps> = ({ orders, products, onSaveOrder, onUpdateStatus, onDeleteOrder }) => {
  const [view, setView] = useState<'ALL' | 'PENDING' | 'DELIVERED' | 'COMPLETED'>('ALL');
  const [mode, setMode] = useState<'LIST' | 'POS'>('LIST');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Payment Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
  const [paymentData, setPaymentData] = useState({
    status: PaymentStatus.PAID,
    method: PaymentMethod.CASH,
    amount: 0,
    note: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  const handleCreateOrder = (order: Order) => {
    onSaveOrder(order, false);
    setMode('LIST');
  };

  const handleUpdateOrder = (order: Order) => {
    onSaveOrder(order, true);
    setMode('LIST');
    setEditingOrder(null);
  };

  const startEdit = (order: Order) => {
    setEditingOrder(order);
    setMode('POS');
  };

  const openCompletionModal = (order: Order) => {
    setCompletingOrder(order);
    setPaymentData({
      status: PaymentStatus.PAID,
      method: PaymentMethod.CASH,
      amount: order.totalAmount, // Default to full amount
      note: order.note || ''
    });
    setIsPaymentOpen(true);
  };

  const handleConfirmCompletion = () => {
    if (!completingOrder) return;

    // Validate if status is PAID or PARTIAL
    if (paymentData.status !== PaymentStatus.UNPAID) {
      if (paymentData.method === PaymentMethod.NONE) {
        alert("Please select a payment method.");
        return;
      }
    }

    const details = {
      status: paymentData.status,
      method: paymentData.status === PaymentStatus.UNPAID ? PaymentMethod.NONE : paymentData.method,
      amountPaid: paymentData.status === PaymentStatus.UNPAID ? 0 : paymentData.amount
    };

    onUpdateStatus(completingOrder.id, OrderStatus.COMPLETED, details, paymentData.note);
    setIsPaymentOpen(false);
    setCompletingOrder(null);
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
        o.id.slice(0, 8).includes(term) ||
        o.note?.toLowerCase().includes(term)
      );
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, view, searchTerm]);

  if (mode === 'POS') {
    return (
      <POSCounter 
        products={products} 
        initialOrder={editingOrder} 
        onSaveOrder={editingOrder ? handleUpdateOrder : handleCreateOrder}
        onCancel={() => { setMode('LIST'); setEditingOrder(null); }}
      />
    );
  }

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
                placeholder="Search orders, notes..." 
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
          <Button onClick={() => { setEditingOrder(null); setMode('POS'); }} icon={Plus} className="whitespace-nowrap">
            New Order
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredOrders.map(order => (
          <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-xs text-gray-400">#{order.id.slice(0, 6)}</span>
                  <span className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()} {new Date(order.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <Badge color={
                    order.status === 'COMPLETED' ? 'green' : 
                    order.status === 'DELIVERED' ? 'blue' : 'orange'
                  }>{order.status}</Badge>
                  {order.status === 'COMPLETED' && (
                    <Badge color={order.paymentDetails.status === 'PAID' ? 'green' : 'red'}>
                      {order.paymentDetails.status}
                    </Badge>
                  )}
                </div>

                <div className="flex justify-between items-start">
                   <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{order.customerName || 'Walk-in Customer'}</h3>
                      {order.customerPhone && <p className="text-sm text-gray-500">{order.customerPhone}</p>}
                   </div>
                   <div className="text-right md:hidden">
                      <div className="font-bold text-lg text-brand-700">₹{order.totalAmount.toFixed(0)}</div>
                   </div>
                </div>
                
                {/* Note Preview */}
                {order.note && (
                  <div className="mt-2 bg-yellow-50 text-yellow-800 text-xs p-2 rounded border border-yellow-100 flex gap-1 items-start">
                    <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>{order.note}</span>
                  </div>
                )}

                <div className="mt-3 bg-gray-50 p-2 rounded-lg text-sm space-y-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between w-full">
                      <span className="text-gray-700 flex items-center gap-1">
                         <span className="font-medium">{item.quantity}x</span> {item.productName}
                      </span>
                      <span className="text-gray-500">₹{(item.quantity * item.sellingPriceSnapshot).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between w-full border-t pt-1 mt-1 font-medium">
                     <span>Total</span>
                     <span>₹{order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto mt-2 md:mt-0 border-t md:border-t-0 pt-3 md:pt-0">
                <Button size="sm" variant="outline" icon={Edit} onClick={() => startEdit(order)}>
                  Edit
                </Button>

                {order.status === OrderStatus.PENDING && (
                  <Button size="sm" variant="secondary" icon={Truck} onClick={() => onUpdateStatus(order.id, OrderStatus.DELIVERED)}>
                    Deliver
                  </Button>
                )}

                {(order.status === OrderStatus.DELIVERED || order.status === OrderStatus.PENDING) && (
                   <Button size="sm" variant="success" icon={CheckCircle} onClick={() => openCompletionModal(order)}>
                    Complete
                  </Button>
                )}

                <Button size="sm" variant="outline" className="text-red-600 border-red-200" icon={Trash2} onClick={() => onDeleteOrder(order.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {filteredOrders.length === 0 && (
           <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
             <div className="p-4 bg-gray-50 rounded-full mb-3">
                <Search className="w-6 h-6 text-gray-400" />
             </div>
             <p>No orders found.</p>
           </div>
        )}
      </div>

      {/* Payment & Completion Modal */}
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Complete Order">
        <div className="space-y-4">
          <div className="bg-brand-50 p-4 rounded-lg text-brand-900 flex justify-between items-center">
            <span className="font-medium">Order Total:</span>
            <span className="font-bold text-xl">₹{completingOrder?.totalAmount.toFixed(2)}</span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <div className="flex gap-2">
              {[PaymentStatus.PAID, PaymentStatus.PARTIAL, PaymentStatus.UNPAID].map(s => (
                <button
                  key={s}
                  onClick={() => setPaymentData({ ...paymentData, status: s, amount: s === PaymentStatus.PAID ? (completingOrder?.totalAmount || 0) : 0 })}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border ${paymentData.status === s ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {paymentData.status !== PaymentStatus.UNPAID && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentData({ ...paymentData, method: PaymentMethod.CASH })}
                    className={`py-2 text-sm font-medium rounded-lg border ${paymentData.method === PaymentMethod.CASH ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700'}`}
                  >
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentData({ ...paymentData, method: PaymentMethod.ONLINE })}
                    className={`py-2 text-sm font-medium rounded-lg border ${paymentData.method === PaymentMethod.ONLINE ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
                  >
                    Online / UPI
                  </button>
                </div>
              </div>

              <div>
                 <Input 
                   label="Amount Received" 
                   type="number" 
                   value={paymentData.amount}
                   onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                 />
              </div>
            </div>
          )}

          <Textarea 
            label="Final Note (Optional)" 
            placeholder="E.g. Paid via PhonePe, balance next week..."
            value={paymentData.note}
            onChange={e => setPaymentData({ ...paymentData, note: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4">
             <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
             <Button variant="success" onClick={handleConfirmCompletion} icon={CheckCircle}>Confirm Completion</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
