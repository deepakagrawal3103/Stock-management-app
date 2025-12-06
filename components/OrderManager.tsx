
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, Product, PaymentStatus, PaymentMethod } from '../types';
import { Button, Card, Input, Modal, Badge, Textarea } from './ui/Common';
import { POSCounter } from './POSCounter';
import { Plus, Trash2, CheckCircle, Search, Edit, Phone, MessageCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderManagerProps {
  orders: Order[];
  products: Product[];
  onSaveOrder: (order: Order, isEdit: boolean) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus, paymentDetails?: any, note?: string) => void;
  onDeleteOrder: (id: string) => void;
}

export const OrderManager: React.FC<OrderManagerProps> = ({ orders, products, onSaveOrder, onUpdateStatus, onDeleteOrder }) => {
  const [view, setView] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [mode, setMode] = useState<'LIST' | 'POS'>('LIST');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  const [completedFilter, setCompletedFilter] = useState<'TODAY' | 'CUSTOM'>('TODAY');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

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
      amount: order.totalAmount, 
      note: order.note || ''
    });
    setIsPaymentOpen(true);
  };

  const handleConfirmCompletion = () => {
    if (!completingOrder) return;
    if (paymentData.status !== PaymentStatus.UNPAID && paymentData.method === PaymentMethod.NONE) {
        alert("Please select a payment method.");
        return;
    }

    const details = {
      status: paymentData.status,
      method: paymentData.status === PaymentStatus.UNPAID ? PaymentMethod.NONE : paymentData.method,
      amountPaid: paymentData.status === PaymentStatus.UNPAID ? 0 : paymentData.amount,
      cashAmount: paymentData.method === PaymentMethod.CASH ? paymentData.amount : 0,
      onlineAmount: paymentData.method === PaymentMethod.ONLINE ? paymentData.amount : 0,
      totalPaid: paymentData.amount
    };

    onUpdateStatus(completingOrder.id, OrderStatus.COMPLETED, details, paymentData.note);
    setIsPaymentOpen(false);
    setCompletingOrder(null);
  };

  const handleWhatsApp = (order: Order) => {
    if (!order.customerPhone) return;
    
    // Sanitize phone number: remove non-numeric characters
    let cleanPhone = order.customerPhone.replace(/\D/g, '');
    
    // Assume India (91) if 10 digits
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const text = `Namaste ${order.customerName}, your order #${order.id.slice(0,5)} from PrintBazar is ready. Total: ₹${order.totalAmount.toFixed(0)}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const printOrderInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      alert("Pop-up blocked. Please allow pop-ups to print invoices.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${order.id.slice(0, 6)}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 400px; margin: 0 auto; color: #000; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 20px; font-weight: bold; margin: 0; }
          .subtitle { font-size: 12px; }
          .info { font-size: 12px; margin-bottom: 15px; }
          .info p { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px; }
          th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; }
          td { padding: 5px 0; }
          .total-row { border-top: 1px solid #000; font-weight: bold; font-size: 14px; }
          .text-right { text-align: right; }
          .footer { text-align: center; font-size: 10px; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; }
          @media print {
            body { padding: 0; margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">PRINT BAZAR</h1>
          <p class="subtitle">Printing & Stationery Services</p>
        </div>
        
        <div class="info">
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Order ID:</strong> #${order.id.slice(0, 6)}</p>
          <p><strong>Customer:</strong> ${order.customerName}</p>
          <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${item.sellingPriceSnapshot}</td>
                <td class="text-right">${(item.quantity * item.sellingPriceSnapshot).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3">Total</td>
              <td class="text-right">₹${order.totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Please visit again.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    // Allow time for styles to load
    setTimeout(() => {
      printWindow.print();
      // Optional: printWindow.close();
    }, 500);
  };

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (view !== 'ALL') {
      list = list.filter(o => o.status === view);
    }
    if (view === 'COMPLETED') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      list = list.filter(o => {
        const orderDate = o.completedAt ? new Date(o.completedAt) : new Date(o.date);
        if (completedFilter === 'TODAY') {
          return orderDate >= startOfDay;
        } else if (completedFilter === 'CUSTOM' && customDateStart) {
          const start = new Date(customDateStart);
          const end = customDateEnd ? new Date(customDateEnd) : new Date(customDateStart);
          end.setHours(23, 59, 59, 999);
          return orderDate >= start && orderDate <= end;
        }
        return true;
      });
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
  }, [orders, view, searchTerm, completedFilter, customDateStart, customDateEnd]);

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
    <div className="space-y-4 max-w-2xl mx-auto md:max-w-none">
      {/* Controls */}
      <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-soft border border-gray-100 flex flex-col gap-3">
        <div className="flex justify-between items-center px-1">
          <div className="flex gap-1 overflow-x-auto no-scrollbar w-full md:w-auto">
            {(['ALL', 'PENDING', 'COMPLETED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setView(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  view === status 
                    ? 'bg-gray-900 text-white shadow-md' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-100'
                }`}
              >
                {status} <span className="opacity-60 ml-0.5">{status !== 'ALL' ? `(${orders.filter(o => o.status === status).length})` : ''}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 px-1">
           <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                  type="text" 
                  placeholder="Search orders..." 
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <Button onClick={() => { setEditingOrder(null); setMode('POS'); }} icon={Plus} className="shrink-0 shadow-lg shadow-brand-500/30">
             New
           </Button>
        </div>

        {view === 'COMPLETED' && (
           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex items-center gap-2 px-1 overflow-x-auto no-scrollbar pb-1">
              <button onClick={() => setCompletedFilter('TODAY')} className={`px-2 py-1 rounded text-xs font-medium border ${completedFilter === 'TODAY' ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-white border-gray-200 text-gray-600'}`}>Today</button>
              <button onClick={() => setCompletedFilter('CUSTOM')} className={`px-2 py-1 rounded text-xs font-medium border ${completedFilter === 'CUSTOM' ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-white border-gray-200 text-gray-600'}`}>Custom</button>
              {completedFilter === 'CUSTOM' && (
                <div className="flex items-center gap-1">
                   <input type="date" value={customDateStart} onChange={e => setCustomDateStart(e.target.value)} className="border rounded px-1 py-0.5 text-xs bg-white" />
                   <span className="text-gray-400">-</span>
                   <input type="date" value={customDateEnd} onChange={e => setCustomDateEnd(e.target.value)} className="border rounded px-1 py-0.5 text-xs bg-white" />
                </div>
              )}
           </motion.div>
        )}
      </div>

      {/* List */}
      <motion.div layout className="grid gap-3">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map(order => (
            <motion.div 
              key={order.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
            >
              <Card className="p-0 hover:shadow-lg transition-all group border-l-4 border-l-transparent hover:border-l-brand-500">
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">#{order.id.slice(0, 5)}</span>
                        <Badge color={
                          order.status === 'COMPLETED' ? 'green' : 'yellow'
                        }>{order.status}</Badge>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base">{order.customerName || 'Walk-in Customer'}</h3>
                      {order.customerPhone && <p className="text-xs text-gray-500 font-medium">{order.customerPhone}</p>}
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-bold text-gray-900">₹{order.totalAmount.toFixed(0)}</p>
                       <p className="text-[10px] text-gray-400">
                         {order.completedAt ? new Date(order.completedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(order.date).toLocaleDateString()}
                       </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50/50 rounded-lg p-2 text-xs text-gray-600 space-y-1">
                    {order.items.slice(0, 2).map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.quantity}x {item.productName}</span>
                        <span className="font-medium">₹{(item.sellingPriceSnapshot * item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                    {order.items.length > 2 && <div className="text-gray-400 italic text-[10px]">+ {order.items.length - 2} more items</div>}
                  </div>

                  {order.note && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                      <p className="text-xs text-amber-900 font-medium leading-relaxed">
                        <span className="font-bold text-amber-600 uppercase text-[10px] mr-1.5 tracking-wider">Note:</span>
                        {order.note}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(order)} icon={Edit} className="h-8 w-8 p-0 text-gray-400 hover:text-brand-600" />
                    <Button variant="ghost" size="sm" onClick={() => printOrderInvoice(order)} icon={FileText} className="h-8 w-8 p-0 text-gray-400 hover:text-indigo-600" />
                    
                    {order.customerPhone && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => window.open(`tel:${order.customerPhone}`)} icon={Phone} className="h-8 w-8 p-0 text-gray-400 hover:text-green-600" />
                        <Button variant="ghost" size="sm" onClick={() => handleWhatsApp(order)} icon={MessageCircle} className="h-8 w-8 p-0 text-gray-400 hover:text-green-500" />
                      </>
                    )}

                    <Button variant="ghost" size="sm" onClick={() => onDeleteOrder(order.id)} icon={Trash2} className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" />
                    
                    {order.status === 'PENDING' && (
                      <Button size="sm" variant="primary" onClick={() => openCompletionModal(order)} icon={CheckCircle} className="ml-auto shadow-none bg-brand-600 text-white hover:bg-brand-700">
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredOrders.length === 0 && (
           <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
              <p>No orders found</p>
           </div>
        )}
      </motion.div>

      {/* Completion Modal */}
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Complete Order">
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl text-center">
             <p className="text-gray-500 text-xs uppercase font-bold">Total Amount</p>
             <p className="text-3xl font-bold text-gray-900 mt-1">₹{completingOrder?.totalAmount}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Payment Status</label>
            <div className="flex gap-2">
              {[PaymentStatus.PAID, PaymentStatus.UNPAID].map(s => (
                <button
                  key={s}
                  onClick={() => setPaymentData({ ...paymentData, status: s })}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    paymentData.status === s 
                      ? 'border-brand-500 bg-brand-50 text-brand-700' 
                      : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {paymentData.status === PaymentStatus.PAID && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
               <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Payment Method</label>
               <div className="flex gap-2 mb-3">
                  {[PaymentMethod.CASH, PaymentMethod.ONLINE].map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentData({ ...paymentData, method: m })}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                        paymentData.method === m 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                          : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
               </div>
               <Input 
                 label="Amount Paid" 
                 type="number" 
                 value={paymentData.amount} 
                 onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })} 
               />
            </motion.div>
          )}

          <Textarea 
            label="Note (Optional)" 
            placeholder="Add payment note..." 
            value={paymentData.note} 
            onChange={e => setPaymentData({ ...paymentData, note: e.target.value })} 
          />

          <div className="pt-4 flex gap-3">
             <Button variant="ghost" onClick={() => setIsPaymentOpen(false)} className="flex-1">Cancel</Button>
             <Button onClick={handleConfirmCompletion} className="flex-1 shadow-lg shadow-brand-500/20">Confirm</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
