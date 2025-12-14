
import React, { useState, useEffect, useMemo } from 'react';
import { UnpaidWriting, Order, Product, OrderStatus } from '../types';
import { v2 } from '../services/storage';
import { Button, Card, Input, Modal, Badge, Textarea } from './ui/Common';
import { RoughWork } from './RoughWork'; 
import { Plus, Trash2, CheckCircle, AlertTriangle, Book, PenTool, Search, X, Calendar, PieChart, TrendingUp, DollarSign, Package } from 'lucide-react';

interface UnpaidWritingsManagerProps {
  orders?: Order[];
  products?: Product[];
}

export const UnpaidWritingsManager: React.FC<UnpaidWritingsManagerProps> = ({ orders = [], products = [] }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CREDIT' | 'ROUGH'>('OVERVIEW');
  const [writings, setWritings] = useState<UnpaidWriting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWriting, setNewWriting] = useState<Partial<UnpaidWriting>>({
    title: '', description: '', amount: 0, category: 'Unpaid'
  });

  const loadData = () => {
    setWritings(v2.getUnpaidWritings().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- STAT CALCULATIONS ---
  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Total Unpaid (Global)
    // Sum of "Credit Book" Unpaid
    const creditBookUnpaid = writings.filter(w => w.status === 'UNPAID').reduce((sum, w) => sum + w.amount, 0);
    
    // Sum of "Pending Balance" on Orders
    // FIX: Only include orders that are COMPLETED/DELIVERED or Explicitly marked as Unpaid category.
    // Exclude basic PENDING orders from "Debt" calculation.
    const catMap = v2.getOrderCategoryMap();
    const cats = v2.getCategories();

    const ordersUnpaid = orders.reduce((sum, o) => {
        const paid = o.paymentDetails?.totalPaid || 0;
        const remaining = Math.max(0, o.totalAmount - paid);
        
        if (remaining <= 0) return sum;

        // Condition 1: Order is Completed or Delivered (Real Debt)
        const isRealDebt = o.status === OrderStatus.COMPLETED || o.status === OrderStatus.DELIVERED;
        
        // Condition 2: Explicitly categorized as 'Unpaid' (even if Pending)
        const mapping = catMap.find(m => m.orderId === o.id);
        const catName = mapping ? cats.find(ct => ct.id === mapping.categoryId)?.name : '';
        const isExplicitUnpaid = catName === 'Unpaid';

        if (isRealDebt || isExplicitUnpaid) {
            return sum + remaining;
        }
        return sum;
    }, 0);
    
    const totalUnpaid = creditBookUnpaid + ordersUnpaid;

    // 2. Daily Stats (Revenue, Profit, Split)
    let dailyRevenue = 0;
    let dailyProfit = 0;
    let dailyCash = 0;
    let dailyOnline = 0;

    orders.forEach(o => {
        // Strict "Today" check on completion date for completed orders
        if (o.status === OrderStatus.COMPLETED && o.completedAt && new Date(o.completedAt) >= startOfDay) {
             const rev = o.paymentDetails?.totalPaid || 0;
             dailyRevenue += rev;
             
             if (o.paymentDetails?.cashAmount) dailyCash += o.paymentDetails.cashAmount;
             if (o.paymentDetails?.onlineAmount) dailyOnline += o.paymentDetails.onlineAmount;
             // Fallback if split not detailed but method is
             if (!o.paymentDetails?.cashAmount && !o.paymentDetails?.onlineAmount) {
                if (o.paymentDetails?.method === 'CASH') dailyCash += rev;
                else if (o.paymentDetails?.method === 'ONLINE') dailyOnline += rev;
             }

             // Profit
             const cost = o.items.reduce((acc, i) => acc + (i.costPriceSnapshot * i.quantity), 0);
             dailyProfit += (rev - cost);
        }
    });

    // 3. Inventory Stats
    let stockValue = 0;
    products.forEach(p => {
        stockValue += (p.quantity * p.costPrice);
    });

    // 4. Pending Production Cost (Shortage Cost)
    let productionCost = 0;
    const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING);
    
    // Calculate demand map for stock items
    const productDemand: Record<string, number> = {};
    
    pendingOrders.forEach(o => {
       o.items.forEach(i => {
          if (i.isCustom) {
             // Custom items always incur production cost (labour/material not tracked in stock)
             productionCost += (i.costPriceSnapshot * i.quantity);
          } else {
             productDemand[i.productId] = (productDemand[i.productId] || 0) + i.quantity;
          }
       });
    });

    // Calculate shortage cost
    products.forEach(p => {
       const demand = productDemand[p.id] || 0;
       const stock = p.quantity;
       const needed = Math.max(0, demand - stock);
       if (needed > 0) {
          productionCost += (needed * p.costPrice);
       }
    });

    return {
        totalUnpaid,
        creditBookUnpaid,
        ordersUnpaid,
        dailyRevenue,
        dailyProfit,
        dailyCash,
        dailyOnline,
        stockValue,
        productionCost
    };
  }, [writings, orders, products]);


  const handleSave = () => {
    if (!newWriting.title || !newWriting.amount) return;
    
    const item: UnpaidWriting = {
      id: crypto.randomUUID(),
      title: newWriting.title || 'Unknown',
      description: newWriting.description || '',
      amount: Number(newWriting.amount),
      category: newWriting.category || 'Unpaid',
      createdAt: new Date().toISOString(),
      status: 'UNPAID'
    };

    v2.addUnpaidWriting(item);
    setIsModalOpen(false);
    setNewWriting({ title: '', description: '', amount: 0, category: 'Unpaid' });
    loadData();
  };

  const markAsPaid = (id: string) => {
    const item = writings.find(w => w.id === id);
    if (item) {
      v2.updateUnpaidWriting({ ...item, status: 'PAID' });
      loadData();
    }
  };

  const handleDelete = (id: string) => {
    if(confirm('Delete this record?')) {
      v2.deleteUnpaidWriting(id);
      loadData();
    }
  };

  const filteredWritings = useMemo(() => {
    return writings.filter(w => 
      w.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      w.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [writings, searchTerm]);

  return (
    <div className="space-y-6">
       {/* Tabs */}
       <div className="flex p-1 bg-white border border-gray-200 rounded-xl w-full max-w-lg mx-auto shadow-sm sticky top-20 z-20">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'OVERVIEW' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PieChart className="w-4 h-4" /> Reports
        </button>
        <button
          onClick={() => setActiveTab('CREDIT')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'CREDIT' ? 'bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Book className="w-4 h-4" /> Credit Book
        </button>
        <button
          onClick={() => setActiveTab('ROUGH')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'ROUGH' ? 'bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PenTool className="w-4 h-4" /> Scratchpad
        </button>
      </div>

      <div>
        {activeTab === 'ROUGH' ? (
           <div className="h-[70vh]">
             <RoughWork />
           </div>
        ) : activeTab === 'OVERVIEW' ? (
            <div className="space-y-6">
                
                {/* 1. Unpaid Summary */}
                <Card className="p-0 border-l-4 border-l-red-500 overflow-hidden">
                   <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                         <div className="bg-white p-2 rounded-lg shadow-sm">
                             <AlertTriangle className="w-6 h-6 text-red-500" />
                         </div>
                         <div>
                            <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Total Unpaid (Market)</p>
                            <p className="text-2xl font-bold text-gray-900">₹{stats.totalUnpaid.toFixed(0)}</p>
                         </div>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 text-center divide-x divide-gray-100">
                      <div className="p-3">
                         <p className="text-[10px] text-gray-400 font-bold uppercase">Credit Book</p>
                         <p className="font-bold text-gray-800">₹{stats.creditBookUnpaid.toFixed(0)}</p>
                      </div>
                      <div className="p-3">
                         <p className="text-[10px] text-gray-400 font-bold uppercase">Order Balances</p>
                         <p className="font-bold text-gray-800">₹{stats.ordersUnpaid.toFixed(0)}</p>
                      </div>
                   </div>
                </Card>

                {/* 2. Today's Performance */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 bg-gradient-to-br from-white to-emerald-50 border border-emerald-100">
                       <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Today's Revenue</p>
                       <p className="text-2xl font-bold text-gray-900">₹{stats.dailyRevenue.toFixed(0)}</p>
                       <div className="mt-2 text-[10px] flex gap-2">
                          <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Cash: {stats.dailyCash}</span>
                          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">Online: {stats.dailyOnline}</span>
                       </div>
                    </Card>
                    <Card className="p-4 bg-gradient-to-br from-white to-indigo-50 border border-indigo-100">
                       <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Today's Profit</p>
                       <p className="text-2xl font-bold text-gray-900">₹{stats.dailyProfit.toFixed(0)}</p>
                       <p className="text-[10px] text-indigo-400 mt-2">Based on Cost of Goods</p>
                    </Card>
                </div>

                {/* 3. Inventory & Costing */}
                <div className={`grid gap-4 ${stats.productionCost > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <Card className="p-4 border-l-4 border-l-blue-500">
                       <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-blue-500" />
                          <p className="text-xs font-bold text-gray-500 uppercase">Stock Value Left</p>
                       </div>
                       <p className="text-xl font-bold text-gray-900">₹{stats.stockValue.toFixed(0)}</p>
                    </Card>
                    
                    {stats.productionCost > 0 && (
                      <Card className="p-4 border-l-4 border-l-orange-500">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-orange-500" />
                            <p className="text-xs font-bold text-gray-500 uppercase">Cost for Prints</p>
                        </div>
                        <p className="text-xl font-bold text-gray-900">₹{stats.productionCost.toFixed(0)}</p>
                        <p className="text-[10px] text-gray-400">To fulfill pending orders</p>
                      </Card>
                    )}
                </div>

            </div>
        ) : (
          <div className="space-y-6">
            
            {/* Actions Bar with Sticky Search */}
            <div className="sticky top-32 z-10 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-soft border border-gray-100 flex gap-2">
              <div className="relative flex-1">
                 <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                 <input 
                    type="text" 
                    placeholder="Search records..." 
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
                 {searchTerm && (
                   <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                     <X className="w-4 h-4" />
                   </button>
                 )}
              </div>
              <Button onClick={() => setIsModalOpen(true)} icon={Plus} className="shadow-lg shadow-brand-500/20 whitespace-nowrap shrink-0">
                Add Record
              </Button>
            </div>

            <div className="grid gap-3">
              {filteredWritings.map((item) => (
                <Card key={item.id} className={`p-4 border-l-4 ${item.status === 'UNPAID' ? 'border-l-red-500' : 'border-l-emerald-500'} transition-all hover:shadow-md`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold text-lg ${item.status === 'PAID' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.title}</h3>
                        <Badge color={item.status === 'UNPAID' ? 'red' : 'green'}>{item.status}</Badge>
                        {item.relatedOrderId && <Badge color="blue">Order Linked</Badge>}
                      </div>
                      <p className="text-sm text-gray-500">{item.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                         <Calendar className="w-3 h-3 text-gray-400" />
                         <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">₹{item.amount}</p>
                      <div className="flex gap-2 mt-3 justify-end">
                        {item.status === 'UNPAID' && (
                          <Button size="sm" variant="success" onClick={() => markAsPaid(item.id)} icon={CheckCircle}>Mark Paid</Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => handleDelete(item.id)} icon={Trash2} />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredWritings.length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                   {searchTerm ? 'No matching records found.' : 'No unpaid records found.'}
                </div>
              )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Unpaid Writing">
              <div className="space-y-4">
                <Input label="Title" value={newWriting.title} onChange={e => setNewWriting({...newWriting, title: e.target.value})} placeholder="e.g. Ramesh Credits" autoFocus />
                <Input label="Amount" type="number" value={newWriting.amount} onChange={e => setNewWriting({...newWriting, amount: parseFloat(e.target.value)})} />
                <Textarea label="Description" value={newWriting.description} onChange={e => setNewWriting({...newWriting, description: e.target.value})} placeholder="Optional details..." />
                <Button onClick={handleSave} className="w-full mt-4">Save Record</Button>
              </div>
            </Modal>
          </div>
        )}
      </div>
    </div>
  );
};
