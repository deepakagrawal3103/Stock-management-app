
import React, { useMemo, useState, useEffect } from 'react';
import { Product, Order, OrderStatus } from '../types';
import { v2 } from '../services/storage';
import { Card, Textarea, Badge } from './ui/Common';
import { NeedSection } from './NeedSection'; // Integrated Manual Needs
import { Printer, AlertTriangle, Package, CheckCircle2, ListChecks, FileDigit, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RequirementViewProps {
  products: Product[];
  orders: Order[];
}

export const RequirementView: React.FC<RequirementViewProps> = ({ products, orders }) => {
  const [activeTab, setActiveTab] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [note, setNote] = useState('');

  useEffect(() => {
    setNote(v2.getNeedsNote());
  }, []);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    v2.saveNeedsNote(val);
  };

  const { requirements, totalOrderedCost, totalPrintingCost, pendingOrderCount } = useMemo(() => {
    // 1. Get ALL Pending orders (regardless of date)
    const activeOrders = orders.filter(o => o.status === OrderStatus.PENDING);
    
    // 2. Calculate Total Demand per Product across ALL pending orders
    const productDemand: Record<string, { totalQty: number, orderCount: number }> = {};
    
    activeOrders.forEach(order => {
      order.items.forEach(item => {
        // Only count tracked inventory items (not ad-hoc custom items)
        if (!item.isCustom) {
          if (!productDemand[item.productId]) {
            productDemand[item.productId] = { totalQty: 0, orderCount: 0 };
          }
          productDemand[item.productId].totalQty += item.quantity;
          // We increment order count slightly differently if we wanted unique orders per product, 
          // but here we just track demand.
        }
      });
    });

    let orderedCost = 0;
    let printingCost = 0;

    const list = products.map(p => {
      const demandData = productDemand[p.id] || { totalQty: 0, orderCount: 0 };
      const orderedQty = demandData.totalQty;
      const currentStock = p.quantity;
      
      // The "To Print" or "Shortage" is: Needed - Stock
      // If we have 10 ordered and 4 stock, we need to print 6.
      // If we have 10 ordered and 15 stock, we need to print 0.
      const needed = Math.max(0, orderedQty - currentStock);

      if (orderedQty > 0) orderedCost += (orderedQty * p.costPrice);
      if (needed > 0) printingCost += (needed * p.costPrice);

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        currentStock: currentStock,
        orderedQty: orderedQty, // Total Required in Pending
        needed: needed,         // Net Shortage
        costPrice: p.costPrice
      };
    }).filter(item => item.orderedQty > 0); // Only show items that are actually in pending orders

    // Sort: Items with shortage (needed > 0) first
    list.sort((a, b) => b.needed - a.needed);

    return { 
      requirements: list, 
      totalOrderedCost: orderedCost, 
      totalPrintingCost: printingCost,
      pendingOrderCount: activeOrders.length
    };
  }, [products, orders]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex p-1 bg-white border border-gray-200 rounded-xl w-full max-w-md mx-auto shadow-sm">
        <button
          onClick={() => setActiveTab('AUTO')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'AUTO' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileDigit className="w-4 h-4" /> Auto Calculated
        </button>
        <button
          onClick={() => setActiveTab('MANUAL')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'MANUAL' ? 'bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ListChecks className="w-4 h-4" /> Manual List
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'MANUAL' ? (
          <motion.div key="manual" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <NeedSection orders={orders} />
          </motion.div>
        ) : (
          <motion.div key="auto" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            
            {/* Context Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3">
               <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
               <div>
                 <p className="text-sm text-blue-800 font-medium">
                   Calculated from <span className="font-bold">{pendingOrderCount} Pending Orders</span> (All dates).
                 </p>
                 <p className="text-xs text-blue-600">
                   Shows total quantity required vs what you have in stock.
                 </p>
               </div>
            </div>

            {/* Top Note */}
            <Card className="p-4 border-l-4 border-l-brand-500 bg-brand-50/20">
              <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-500" /> 
                Priority Note (Admin)
              </h3>
              <Textarea 
                value={note}
                onChange={handleNoteChange}
                placeholder="Write urgent printing notes here..."
                className="bg-white border-brand-100 focus:ring-brand-200"
              />
            </Card>

            {/* Cost Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Value (Pending)</p>
                  <p className="text-xl font-bold text-gray-900">₹{totalOrderedCost.toFixed(0)}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Printing Cost (Only Shortage)</p>
                  <p className="text-xl font-bold text-gray-900">₹{totalPrintingCost.toFixed(0)}</p>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900">Calculated Requirements</h3>
                <Badge>{requirements.length} Items</Badge>
              </div>

              {/* Mobile View */}
              <div className="block md:hidden divide-y divide-gray-50">
                {requirements.map((item) => (
                  <div key={item.id} className={`p-4 ${item.needed > 0 ? "bg-red-50/30" : "bg-white"}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">{item.category}</span>
                      </div>
                      {item.needed > 0 ? (
                         <div className="text-right">
                           <span className="block text-[10px] font-bold text-red-400 uppercase">To Print</span>
                           <span className="text-xl font-bold text-red-600">{item.needed}</span>
                         </div>
                      ) : (
                         <div className="text-right">
                           <span className="block text-[10px] font-bold text-emerald-400 uppercase">Status</span>
                           <span className="text-sm font-bold text-emerald-600">Stock OK</span>
                         </div>
                      )}
                    </div>
                    
                    {/* The 3 Columns requested by User */}
                    <div className="grid grid-cols-2 gap-2 text-center bg-gray-50 rounded-lg p-2 border border-gray-100">
                      <div className="border-r border-gray-200">
                          <div className="text-[10px] text-gray-400 font-bold uppercase">Total Required</div>
                          <div className="font-bold text-gray-800 text-lg">{item.orderedQty}</div>
                          <div className="text-[9px] text-gray-400">in Pending</div>
                      </div>
                      <div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">In Stock</div>
                          <div className="font-bold text-gray-800 text-lg">{item.currentStock}</div>
                          <div className="text-[9px] text-gray-400">Available</div>
                      </div>
                    </div>
                  </div>
                ))}
                {requirements.length === 0 && (
                   <div className="p-8 text-center text-gray-400 text-sm">Everything is stocked! No printing needed.</div>
                )}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-50">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Total Required (Pending)</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Current Stock</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-red-600 uppercase tracking-wider">Shortage (To Print)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {requirements.map((item) => (
                      <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${item.needed > 0 ? "bg-red-50/10" : ""}`}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.category}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-base font-bold text-gray-900">{item.orderedQty}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-gray-600">
                          {item.currentStock}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.needed > 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-red-100 text-red-700 gap-1.5 shadow-sm animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {item.needed} Needed
                            </span>
                          ) : (
                            <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-lg">
                               Stock Sufficient
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
