
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, Product, PaymentStatus, PaymentMethod } from '../types';
import { v2 } from '../services/storage'; // Import v2 for categories and partial payments
import { Button, Card, Input, Modal, Badge, Textarea } from './ui/Common';
import { POSCounter } from './POSCounter';
import { PartialPaymentModal } from './PartialPaymentModal';
import { CategoryManager } from './CategoryManager';
import { OrderDetailView } from './OrderDetailView'; // New Import
import { Plus, Trash2, CheckCircle, Search, Edit, Phone, MessageCircle, FileText, Calendar, Tag, CreditCard, Eye, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderManagerProps {
  orders: Order[];
  products: Product[];
  onSaveOrder: (order: Order, isEdit: boolean) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus, paymentDetails?: any, note?: string) => void;
  onDeleteOrder: (id: string) => void;
}

export const OrderManager: React.FC<OrderManagerProps> = ({ orders, products, onSaveOrder, onUpdateStatus, onDeleteOrder }) => {
  const [view, setView] = useState<'ALL' | 'PENDING' | 'UNPAID' | 'COMPLETED'>('ALL');
  const [mode, setMode] = useState<'LIST' | 'POS'>('LIST');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // New V2 Filters
  const [dateFilterMode, setDateFilterMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
  
  // Split Payment State
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    status: PaymentStatus;
    method: PaymentMethod;
    amount: string | number;
    cashAmount: string | number;
    onlineAmount: string | number;
    note: string;
  }>({
    status: PaymentStatus.PAID,
    method: PaymentMethod.CASH,
    amount: 0,
    cashAmount: 0,
    onlineAmount: 0,
    note: ''
  });

  // V2 Modals
  const [partialPaymentOrder, setPartialPaymentOrder] = useState<Order | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [categoryTargetOrderId, setCategoryTargetOrderId] = useState<string | null>(null);
  
  // New Order Detail View Modal State
  const [detailViewOrder, setDetailViewOrder] = useState<Order | null>(null);

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
      cashAmount: 0,
      onlineAmount: 0,
      note: order.note || ''
    });
    setIsSplitPayment(false);
    setIsPaymentOpen(true);
  };

  const handleConfirmCompletion = () => {
    if (!completingOrder) return;
    
    // Parse values safely
    const cashVal = parseFloat(paymentData.cashAmount.toString()) || 0;
    const onlineVal = parseFloat(paymentData.onlineAmount.toString()) || 0;
    const amountVal = parseFloat(paymentData.amount.toString()) || 0;

    // Validate
    if (paymentData.status === PaymentStatus.PAID) {
       if (isSplitPayment) {
          if (cashVal + onlineVal !== completingOrder.totalAmount) {
             alert(`Total split amount must match order total (${completingOrder.totalAmount})`);
             return;
          }
       }
    } else if (paymentData.status === PaymentStatus.PARTIAL) {
      // Validate Partial Logic
      const enteredTotal = isSplitPayment 
         ? (cashVal + onlineVal)
         : amountVal;
         
      if (enteredTotal >= completingOrder.totalAmount) {
         // Automatically switch to PAID if they enter full amount
         paymentData.status = PaymentStatus.PAID;
      } else if (enteredTotal <= 0) {
         alert("For partial payment, amount must be greater than 0");
         return;
      }
    }

    const details = {
      status: paymentData.status,
      method: paymentData.status === PaymentStatus.UNPAID ? PaymentMethod.NONE : isSplitPayment ? PaymentMethod.SPLIT : paymentData.method,
      amountPaid: paymentData.status === PaymentStatus.UNPAID ? 0 : isSplitPayment ? (cashVal + onlineVal) : amountVal,
      cashAmount: isSplitPayment ? cashVal : (paymentData.method === PaymentMethod.CASH ? amountVal : 0),
      onlineAmount: isSplitPayment ? onlineVal : (paymentData.method === PaymentMethod.ONLINE ? amountVal : 0),
      totalPaid: paymentData.status === PaymentStatus.UNPAID ? 0 : isSplitPayment ? (cashVal + onlineVal) : amountVal
    };

    onUpdateStatus(completingOrder.id, OrderStatus.COMPLETED, details, paymentData.note);
    setIsPaymentOpen(false);
    setCompletingOrder(null);
  };

  const handleAssignCategory = (catId: string) => {
    if (categoryTargetOrderId) {
      v2.assignCategoryToOrder(categoryTargetOrderId, catId);
      setCategoryTargetOrderId(null);
    }
  };

  const handleWhatsApp = (order: Order) => {
    if (!order.customerPhone) return;
    let cleanPhone = order.customerPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
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
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const filteredOrders = useMemo(() => {
    let list = orders;
    
    // UNPAID LOGIC FIX:
    // Only show orders in UNPAID tab if they have been marked UNPAID via category,
    // OR if they are DELIVERED/COMPLETED but have remaining balance.
    // Pure PENDING orders do not show here by default unless categorized as such.
    if (view === 'UNPAID') {
       list = list.filter(o => {
         const paid = o.paymentDetails?.totalPaid || 0;
         const remaining = Math.max(0, o.totalAmount - paid);
         const category = v2.getCategoryForOrder(o.id);
         const isExplicitUnpaid = category?.name === 'Unpaid';
         const isDeliveredUnpaid = (o.status === OrderStatus.COMPLETED || o.status === OrderStatus.DELIVERED) && remaining > 0;
         
         // Only show if there is actually debt AND it meets criteria
         return remaining > 0 && (isExplicitUnpaid || isDeliveredUnpaid);
       });
    } else if (view !== 'ALL') {
      list = list.filter(o => o.status === view);
    }

    // New V2 Date Filter
    if (dateFilterMode === 'CUSTOM' && filterFrom) {
       const start = new Date(filterFrom);
       const end = filterTo ? new Date(filterTo) : new Date(filterFrom);
       end.setHours(23, 59, 59, 999);
       
       list = list.filter(o => {
          const d = new Date(o.date);
          return d >= start && d <= end;
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
  }, [orders, view, searchTerm, dateFilterMode, filterFrom, filterTo]);

  // Calculate total unpaid amount for the current view (mostly useful when view is UNPAID)
  const totalUnpaidAmount = useMemo(() => {
    if (view !== 'UNPAID') return 0;
    return filteredOrders.reduce((sum, o) => {
      const paid = o.paymentDetails?.totalPaid || 0;
      return sum + Math.max(0, o.totalAmount - paid);
    }, 0);
  }, [filteredOrders, view]);

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
        {/* Main Filters */}
        <div className="flex justify-between items-center px-1">
          <div className="flex gap-1 overflow-x-auto no-scrollbar w-full md:w-auto">
            {(['ALL', 'PENDING', 'UNPAID', 'COMPLETED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setView(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  view === status 
                    ? 'bg-gray-900 text-white shadow-md' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-100'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* New V2 Date Filter Bar */}
        <div className="flex items-center gap-2 px-1 text-sm bg-gray-50 p-2 rounded-xl border border-gray-200">
           <Calendar className="w-4 h-4 text-gray-400" />
           <select 
             className="bg-transparent font-bold text-gray-700 outline-none text-xs" 
             value={dateFilterMode} 
             onChange={e => setDateFilterMode(e.target.value as any)}
           >
             <option value="ALL">All Dates</option>
             <option value="CUSTOM">Filter by Date</option>
           </select>
           {dateFilterMode === 'CUSTOM' && (
             <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1">
               <input type="date" className="bg-white border rounded px-1 py-0.5 text-xs" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
               <span className="text-gray-400">-</span>
               <input type="date" className="bg-white border rounded px-1 py-0.5 text-xs" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
             </motion.div>
           )}
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
      </div>

      {/* Unpaid Summary Header */}
      <AnimatePresence>
        {view === 'UNPAID' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
             <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between">
                <div>
                   <h3 className="text-red-800 font-bold uppercase text-xs tracking-wider">Total Unpaid Amount</h3>
                   <p className="text-2xl font-bold text-red-600 mt-1">₹{totalUnpaidAmount.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-white rounded-full shadow-sm text-red-500">
                   <AlertCircle className="w-6 h-6" />
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <motion.div layout className="grid gap-3">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map(order => {
            const category = v2.getCategoryForOrder(order.id);
            const paid = order.paymentDetails?.totalPaid || 0;
            const unpaid = Math.max(0, order.totalAmount - paid);
            const isUnpaidView = view === 'UNPAID';

            return (
              <motion.div 
                key={order.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card className={`p-0 hover:shadow-lg transition-all group border-l-4 ${isUnpaidView ? 'border-l-red-500' : 'border-l-transparent hover:border-l-brand-500'}`}>
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="cursor-pointer" onClick={() => setDetailViewOrder(order)}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-400">#{order.id.slice(0, 5)}</span>
                          <Badge color={order.status === 'COMPLETED' ? 'green' : 'yellow'}>{order.status}</Badge>
                          {category && <Badge color="brand">{category.name}</Badge>}
                        </div>
                        <h3 className="font-bold text-gray-900 text-base">{order.customerName || 'Walk-in Customer'}</h3>
                        {order.customerPhone && <p className="text-xs text-gray-500 font-medium">{order.customerPhone}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">₹{order.totalAmount.toFixed(0)}</p>
                        {(isUnpaidView || unpaid > 0) ? (
                          <div className="flex flex-col items-end mt-1">
                            <span className="text-[10px] text-gray-400 font-medium">Paid: ₹{paid}</span>
                            <span className="text-xs text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">Unpaid: ₹{unpaid}</span>
                          </div>
                        ) : (
                           <p className="text-[10px] text-gray-400">
                             {order.completedAt ? new Date(order.completedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(order.date).toLocaleDateString()}
                           </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50/50 rounded-lg p-2 text-xs text-gray-600 space-y-1 cursor-pointer" onClick={() => setDetailViewOrder(order)}>
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
                      {/* ADDED: View Detail Button */}
                      <Button variant="ghost" size="sm" onClick={() => setDetailViewOrder(order)} icon={Eye} className="h-8 w-8 p-0 text-gray-400 hover:text-brand-600" />
                      
                      <Button variant="ghost" size="sm" onClick={() => { setCategoryTargetOrderId(order.id); setIsCategoryManagerOpen(true); }} icon={Tag} className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600" />
                      <Button variant="ghost" size="sm" onClick={() => setPartialPaymentOrder(order)} icon={CreditCard} className="h-8 w-8 p-0 text-gray-400 hover:text-purple-600" />
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
            );
          })}
        </AnimatePresence>
        
        {filteredOrders.length === 0 && (
           <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
              <p>No orders found</p>
           </div>
        )}
      </motion.div>

      {/* Completion Modal with Split Payment */}
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Complete Order">
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl text-center">
             <p className="text-gray-500 text-xs uppercase font-bold">Total Amount</p>
             <p className="text-3xl font-bold text-gray-900 mt-1">₹{completingOrder?.totalAmount}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Payment Status</label>
            <div className="flex gap-2">
              {[PaymentStatus.PAID, PaymentStatus.PARTIAL, PaymentStatus.UNPAID].map(s => (
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

          {(paymentData.status === PaymentStatus.PAID || paymentData.status === PaymentStatus.PARTIAL) && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden space-y-4">
               
               {/* Split Payment Toggle */}
               <div className="flex items-center gap-2 mb-2">
                 <input 
                   type="checkbox" 
                   id="splitPayment"
                   checked={isSplitPayment}
                   onChange={e => setIsSplitPayment(e.target.checked)}
                   className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                 />
                 <label htmlFor="splitPayment" className="text-sm font-bold text-gray-700">Split Payment (Online + Cash)</label>
               </div>

               {isSplitPayment ? (
                 <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Input 
                      label="Online Amount" 
                      type="number" 
                      value={paymentData.onlineAmount} 
                      onChange={e => setPaymentData({ ...paymentData, onlineAmount: e.target.value })} 
                      placeholder="0.00"
                    />
                    <Input 
                      label="Cash Amount" 
                      type="number" 
                      value={paymentData.cashAmount} 
                      onChange={e => setPaymentData({ ...paymentData, cashAmount: e.target.value })} 
                      placeholder="0.00"
                    />
                    <div className="flex justify-between text-xs font-bold px-1">
                      <span>Total Entered:</span>
                      <span className={(parseFloat(paymentData.onlineAmount.toString()) + parseFloat(paymentData.cashAmount.toString())) === completingOrder?.totalAmount ? "text-emerald-600" : "text-blue-600"}>
                        ₹{parseFloat(paymentData.onlineAmount.toString()) + parseFloat(paymentData.cashAmount.toString())}
                      </span>
                    </div>
                 </div>
               ) : (
                 <>
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
                     onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })} 
                     placeholder="0.00"
                   />
                 </>
               )}
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

      {/* V2 Additive Modals */}
      <PartialPaymentModal 
         isOpen={!!partialPaymentOrder} 
         onClose={() => setPartialPaymentOrder(null)} 
         order={partialPaymentOrder}
         onPaymentAdded={() => {}}
      />
      <CategoryManager 
         isOpen={isCategoryManagerOpen} 
         onClose={() => setIsCategoryManagerOpen(false)} 
         onSelect={handleAssignCategory}
      />
      {/* ADDED: Order Detail View */}
      <OrderDetailView 
        isOpen={!!detailViewOrder} 
        onClose={() => setDetailViewOrder(null)} 
        order={detailViewOrder}
      />
    </div>
  );
};
