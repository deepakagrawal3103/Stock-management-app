
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, Product, PaymentStatus, PaymentMethod } from '../types';
import { v2 } from '../services/storage'; // Import v2 for categories and partial payments
import { Button, Card, Input, Modal, Badge, Textarea } from './ui/Common';
import { POSCounter } from './POSCounter';
import { PartialPaymentModal } from './PartialPaymentModal';
import { CategoryManager } from './CategoryManager';
import { OrderDetailView } from './OrderDetailView';
import { Plus, Trash2, CheckCircle, Search, Edit, Phone, MessageCircle, FileText, Calendar, Tag, CreditCard, Eye, AlertCircle, ChevronRight, Filter, X } from 'lucide-react';

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
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
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
      const enteredTotal = isSplitPayment ? (cashVal + onlineVal) : amountVal;
      if (enteredTotal >= completingOrder.totalAmount) {
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
    
    const text = `Namaste from Print Bazar,
Your order is ready. ✅

Please confirm whether you will be coming tomorrow or not.

💰 Total Bill: ₹${order.totalAmount.toFixed(0)}

📍 Collection Address:
Bus route board jha bus routes likhe hote hai and driver bethte hai uske just pass pani ki tanki hai vha.

⏰ Important:
Please collect files before going in the class and if u are already in class make sure apko koi director ya teacher roke na.
Agr koi bhi apko rokta hai toh yeh mat bolna ki Print Bazar wale bhaiya s print lene jaa rhe hai,
just tell any of ur personal reasons as if u say that there will be lot of questions.

Thank you,
Print Bazar`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Calculate counts for badges
  const statusCounts = useMemo(() => {
    const c = { ALL: orders.length, PENDING: 0, UNPAID: 0, COMPLETED: 0 };
    const catMap = v2.getOrderCategoryMap();
    const cats = v2.getCategories();
    
    orders.forEach(o => {
       if (o.status === OrderStatus.PENDING) c.PENDING++;
       if (o.status === OrderStatus.COMPLETED) c.COMPLETED++;
       
       const paid = o.paymentDetails?.totalPaid || 0;
       const remaining = Math.max(0, o.totalAmount - paid);
       const mapping = catMap.find(m => m.orderId === o.id);
       const catName = mapping ? cats.find(ct => ct.id === mapping.categoryId)?.name : '';
       
       const isExplicitUnpaid = catName === 'Unpaid';
       const isDeliveredUnpaid = (o.status === OrderStatus.COMPLETED || o.status === OrderStatus.DELIVERED) && remaining > 0;
       
       if (remaining > 0 && (isExplicitUnpaid || isDeliveredUnpaid)) {
           c.UNPAID++;
       }
    });
    return c;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    
    if (view === 'UNPAID') {
       list = list.filter(o => {
         const paid = o.paymentDetails?.totalPaid || 0;
         const remaining = Math.max(0, o.totalAmount - paid);
         const category = v2.getCategoryForOrder(o.id);
         const isExplicitUnpaid = category?.name === 'Unpaid';
         const isDeliveredUnpaid = (o.status === OrderStatus.COMPLETED || o.status === OrderStatus.DELIVERED) && remaining > 0;
         return remaining > 0 && (isExplicitUnpaid || isDeliveredUnpaid);
       });
    } else if (view !== 'ALL') {
      list = list.filter(o => o.status === view);
    }

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
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Optimized Sticky Controls */}
      <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-md px-3 py-3 -mx-4 sm:mx-0 sm:rounded-3xl border-b sm:border border-slate-200/60 shadow-sm flex flex-col gap-2 transition-all">
        {/* Row 1: Search & Primary Actions */}
        <div className="flex gap-2">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-full pl-9 pr-8 py-2 bg-slate-100/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
           </div>
           
           <Button 
             variant={showFilters ? 'primary' : 'secondary'} 
             onClick={() => setShowFilters(!showFilters)} 
             className={`px-3 ${showFilters ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
           >
             <Filter className="w-4 h-4" />
           </Button>

           <Button onClick={() => { setEditingOrder(null); setMode('POS'); }} icon={Plus} className="shrink-0 shadow-lg shadow-brand-500/30">
             New
           </Button>
        </div>

        {/* Row 2: Collapsible Date Filters */}
        {showFilters && (
          <div className="overflow-hidden">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-1 flex flex-col sm:flex-row gap-3 items-center text-sm">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <select 
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none w-full sm:w-auto" 
                    value={dateFilterMode} 
                    onChange={e => setDateFilterMode(e.target.value as any)}
                  >
                    <option value="ALL">All Dates</option>
                    <option value="CUSTOM">Custom Date Range</option>
                  </select>
                </div>
                {dateFilterMode === 'CUSTOM' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto animate-[fadeIn_0.2s]">
                    <input type="date" className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
                    <span className="text-slate-300">-</span>
                    <input type="date" className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Row 3: Status Pills (Horizontal Scroll) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar w-full pb-0.5">
          {(['ALL', 'PENDING', 'UNPAID', 'COMPLETED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setView(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border snap-start ${
                view === status 
                  ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
              {statusCounts[status] > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${view === status ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {statusCounts[status]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Unpaid Summary Header */}
      {view === 'UNPAID' && (
        <div className="overflow-hidden">
            <div className="bg-gradient-to-r from-red-50 to-white border border-red-100 p-4 rounded-2xl flex items-center justify-between shadow-sm mx-1">
              <div>
                  <h3 className="text-red-800 font-bold uppercase text-[10px] tracking-wider mb-0.5">Total Unpaid</h3>
                  <p className="text-2xl font-black text-red-600 tracking-tight">₹{totalUnpaidAmount.toFixed(0)}</p>
              </div>
              <div className="p-2 bg-white rounded-xl shadow-sm text-red-500 border border-red-50">
                  <AlertCircle className="w-6 h-6" />
              </div>
            </div>
        </div>
      )}

      {/* List */}
      <div className="grid gap-3 pb-20">
          {filteredOrders.map(order => {
            const category = v2.getCategoryForOrder(order.id);
            const paid = order.paymentDetails?.totalPaid || 0;
            const unpaid = Math.max(0, order.totalAmount - paid);
            const isUnpaidView = view === 'UNPAID';

            return (
              <div 
                key={order.id} 
              >
                <Card className={`group border-l-4 ${isUnpaidView ? 'border-l-red-500' : 'border-l-transparent hover:border-l-brand-500'} transition-all`}>
                  <div className="p-4 flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="cursor-pointer" onClick={() => setDetailViewOrder(order)}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">#{order.id.slice(0, 5)}</span>
                          <Badge color={order.status === 'COMPLETED' ? 'green' : order.status === 'DELIVERED' ? 'blue' : 'yellow'}>{order.status}</Badge>
                          {category && <Badge color="brand">{category.name}</Badge>}
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">{order.customerName || 'Walk-in Customer'}</h3>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">₹{order.totalAmount.toFixed(0)}</p>
                        {(isUnpaidView || unpaid > 0) ? (
                            <span className="block text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100 mt-1">Due: ₹{unpaid}</span>
                        ) : (
                           <p className="text-[10px] text-slate-400 font-medium mt-1">
                             {order.completedAt ? new Date(order.completedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(order.date).toLocaleDateString()}
                           </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Items Summary */}
                    <div className="bg-slate-50/50 rounded-lg p-2.5 border border-slate-100 text-xs text-slate-600 space-y-1 cursor-pointer" onClick={() => setDetailViewOrder(order)}>
                      {order.items.slice(0, 2).map((item, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="truncate pr-2"><span className="font-bold text-slate-700">{item.quantity}x</span> {item.productName}</span>
                          <span className="font-medium text-slate-900 shrink-0">₹{(item.sellingPriceSnapshot * item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <div className="text-brand-600 font-bold text-[10px] flex items-center gap-1 pt-0.5">
                          + {order.items.length - 2} more <ChevronRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {order.note && (
                      <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2 flex gap-2">
                        <FileText className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-900 font-medium italic line-clamp-1">
                          "{order.note}"
                        </p>
                      </div>
                    )}

                    {/* Actions - Horizontally Scrollable on Mobile */}
                    <div className="pt-2 border-t border-slate-50 -mx-1">
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-1 pb-1">
                        {order.status === 'PENDING' && (
                          <Button size="sm" variant="success" onClick={() => openCompletionModal(order)} icon={CheckCircle} className="mr-2 shrink-0 shadow-none bg-brand-600 text-white">
                            Complete
                          </Button>
                        )}

                        <div className="flex items-center gap-1 ml-auto">
                            <Button variant="ghost" size="sm" onClick={() => setDetailViewOrder(order)} icon={Eye} className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-brand-600 hover:bg-brand-50" />
                            <Button variant="ghost" size="sm" onClick={() => { setCategoryTargetOrderId(order.id); setIsCategoryManagerOpen(true); }} icon={Tag} className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50" />
                            <Button variant="ghost" size="sm" onClick={() => setPartialPaymentOrder(order)} icon={CreditCard} className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50" />
                            <Button variant="ghost" size="sm" onClick={() => startEdit(order)} icon={Edit} className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-brand-600 hover:bg-brand-50" />
                            
                            {order.customerPhone && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => window.open(`tel:${order.customerPhone}`, '_self')} icon={Phone} className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50" />
                                <Button variant="ghost" size="sm" onClick={() => handleWhatsApp(order)} icon={MessageCircle} className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-green-500 hover:bg-green-50" />
                              </>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => onDeleteOrder(order.id)} icon={Trash2} className="h-8 w-8 p-0 rounded-full text-slate-300 hover:text-red-600 hover:bg-red-50" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        
        {filteredOrders.length === 0 && (
           <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 mx-4">
              <p className="font-medium text-sm">No orders found</p>
           </div>
        )}
      </div>

      {/* Completion Modal */}
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Complete Order">
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl text-center border border-slate-100">
             <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Total Amount to Pay</p>
             <p className="text-4xl font-black text-slate-900 mt-2 tracking-tight">₹{completingOrder?.totalAmount}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">Payment Status</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              {[PaymentStatus.PAID, PaymentStatus.PARTIAL, PaymentStatus.UNPAID].map(s => (
                <button
                  key={s}
                  onClick={() => setPaymentData({ ...paymentData, status: s })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
                    paymentData.status === s 
                      ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5' 
                      : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 shadow-none'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {(paymentData.status === PaymentStatus.PAID || paymentData.status === PaymentStatus.PARTIAL) && (
            <div className="overflow-hidden space-y-4 animate-[fadeIn_0.2s]">
               
               <div className="flex items-center gap-3 mb-2 p-3 border border-slate-100 rounded-xl">
                 <input 
                    type="checkbox" 
                    id="splitPayment"
                    checked={isSplitPayment}
                    onChange={e => setIsSplitPayment(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                 />
                 <label htmlFor="splitPayment" className="text-sm font-bold text-slate-700 cursor-pointer select-none">Split Payment (Online + Cash)</label>
               </div>

               {isSplitPayment ? (
                 <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                    <Input label="Online Amount" type="number" value={paymentData.onlineAmount} onChange={e => setPaymentData({ ...paymentData, onlineAmount: e.target.value })} placeholder="0.00" className="bg-white"/>
                    <Input label="Cash Amount" type="number" value={paymentData.cashAmount} onChange={e => setPaymentData({ ...paymentData, cashAmount: e.target.value })} placeholder="0.00" className="bg-white"/>
                 </div>
               ) : (
                 <>
                   <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Payment Method</label>
                   <div className="flex gap-3 mb-4">
                      {[PaymentMethod.CASH, PaymentMethod.ONLINE].map(m => (
                        <button
                          key={m}
                          onClick={() => setPaymentData({ ...paymentData, method: m })}
                          className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                            paymentData.method === m 
                              ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100' 
                              : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                   </div>
                   <Input label="Amount Paid" type="number" value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })} placeholder="0.00" />
                 </>
               )}
            </div>
          )}
          <Textarea label="Note" placeholder="Optional note..." value={paymentData.note} onChange={e => setPaymentData({ ...paymentData, note: e.target.value })} />
          <div className="pt-4 flex gap-3">
             <Button variant="secondary" onClick={() => setIsPaymentOpen(false)} className="flex-1 py-3.5">Cancel</Button>
             <Button onClick={handleConfirmCompletion} className="flex-1 py-3.5 text-base shadow-xl shadow-brand-500/20">Confirm</Button>
          </div>
        </div>
      </Modal>

      <PartialPaymentModal isOpen={!!partialPaymentOrder} onClose={() => setPartialPaymentOrder(null)} order={partialPaymentOrder} onPaymentAdded={() => {}} />
      <CategoryManager isOpen={isCategoryManagerOpen} onClose={() => setIsCategoryManagerOpen(false)} onSelect={handleAssignCategory} />
      <OrderDetailView isOpen={!!detailViewOrder} onClose={() => setDetailViewOrder(null)} order={detailViewOrder} />
    </div>
  );
};
