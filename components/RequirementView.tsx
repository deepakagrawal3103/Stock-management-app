
import React, { useMemo, useState, useEffect } from 'react';
import { Product, Order, OrderStatus } from '../types';
import { v2 } from '../services/storage';
import { Card, Textarea } from './ui/Common';
import { NeedSection } from './NeedSection'; // Integrated Manual Needs
import { Printer, AlertTriangle, Package, CheckCircle2, ListChecks, FileDigit } from 'lucide-react';
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

  const { requirements, totalOrderedCost, totalPrintingCost } = useMemo(() => {
    const activeOrders = orders.filter(o => o.status === OrderStatus.PENDING);
    
    // Map productId -> Total Qty Ordered
    const productDemand: Record<string, number> = {};
    activeOrders.forEach(order => {
      order.items.forEach(item => {
        if (!item.isCustom) {
          productDemand[item.productId] = (productDemand[item.productId] || 0) + item.quantity;
        }
      });
    });

    let orderedCost = 0;
    let printingCost = 0;

    const list = products.map(p => {
      const orderedQty = productDemand[p.id] || 0;
      const currentStock = p.quantity;
      const needed = Math.max(0, orderedQty - currentStock);

      if (orderedQty > 0) orderedCost += (orderedQty * p.costPrice);
      if (needed > 0) printingCost += (needed * p.costPrice);

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        currentStock: currentStock,
        orderedQty: orderedQty,
        needed: needed,
        costPrice: p.costPrice
      };
    }).filter(item => item.orderedQty > 0 || item.needed > 0);

    return { requirements: list, totalOrderedCost: orderedCost, totalPrintingCost: printingCost };
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
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ordered Cost</p>
                  <p className="text-xl font-bold text-gray-900">₹{totalOrderedCost.toFixed(0)}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Printing Pending Cost</p>
                  <p className="text-xl font-bold text-gray-900">₹{totalPrintingCost.toFixed(0)}</p>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900">Printing Requirements</h3>
                <span className="text-xs font-bold text-gray-500 bg-white border px-2 py-1 rounded-lg">{requirements.length} Items</span>
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
                      {item.needed > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-700 animate-pulse">
                          To Print: {item.needed}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <div className="text-[10px] text-gray-400 font-bold uppercase">Stock</div>
                          <div className="font-bold text-gray-800">{item.currentStock}</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <div className="text-[10px] text-gray-400 font-bold uppercase">Ordered</div>
                          <div className="font-bold text-gray-800">{item.orderedQty}</div>
                      </div>
                      <div className={`p-2 rounded-lg border ${item.needed > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                          <div className={`text-[10px] font-bold uppercase ${item.needed > 0 ? 'text-red-400' : 'text-emerald-400'}`}>Remaining</div>
                          <div className={`font-bold ${item.needed > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                            {item.needed > 0 ? item.needed : '0'}
                          </div>
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
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Current Stock</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Total Orders</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Remaining to Print</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {requirements.map((item) => (
                      <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${item.needed > 0 ? "bg-red-50/10" : ""}`}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.category}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-gray-600">
                          {item.currentStock}
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-gray-600">
                          {item.orderedQty}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.needed > 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-red-100 text-red-700 gap-1.5 shadow-sm">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {item.needed}
                            </span>
                          ) : (
                            <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-lg">Done</span>
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
