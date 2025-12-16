
import React, { useMemo, useState, useEffect } from 'react';
import { Product, Order, OrderStatus, StoreStock } from '../types';
import { v2 } from '../services/storage';
import { Card, Textarea, Badge } from './ui/Common';
import { CheckCircle2, FileDigit, Info, Calendar, Truck, AlertTriangle, RefreshCw } from 'lucide-react';

interface RequirementViewProps {
  products: Product[];
  orders: Order[];
}

interface LogisticsItem {
  productId: string;
  carryDeepak: number;
  carryDimple: number;
}

export const RequirementView: React.FC<RequirementViewProps> = ({ products, orders }) => {
  const [note, setNote] = useState('');
  const [storeStocks, setStoreStocks] = useState<StoreStock[]>([]);
  
  // State to hold the user's plan for how much to carry from where, initialized from storage
  const [logisticsPlan, setLogisticsPlan] = useState<Record<string, LogisticsItem>>(() => v2.getLogisticsPlan());

  useEffect(() => {
    setNote(v2.getNeedsNote());
  }, []);

  // Reload store stocks whenever products change (e.g., after order completion or manual stock update)
  useEffect(() => {
    setStoreStocks(v2.getStoreStocks());
  }, [products]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    v2.saveNeedsNote(val);
  };

  const { requirements, pendingOrderCount, dateRange } = useMemo(() => {
    const activeOrders = orders.filter(o => o.status === OrderStatus.PENDING);
    
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    activeOrders.forEach(o => {
      const d = new Date(o.date);
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    });

    const dateRangeStr = minDate && maxDate 
      ? `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}` 
      : 'All Time';
    
    const productDemand: Record<string, { totalQty: number, orderCount: number }> = {};
    
    activeOrders.forEach(order => {
      order.items.forEach(item => {
        if (!item.isCustom) {
          if (!productDemand[item.productId]) {
            productDemand[item.productId] = { totalQty: 0, orderCount: 0 };
          }
          productDemand[item.productId].totalQty += item.quantity;
        }
      });
    });

    const list = products.map(p => {
      const demandData = productDemand[p.id] || { totalQty: 0, orderCount: 0 };
      const orderedQty = demandData.totalQty;
      const currentStock = p.quantity; // Source of Truth
      
      const needed = Math.max(0, orderedQty - currentStock);

      // Find store specific details
      const storeData = storeStocks.find(s => s.productId === p.id);
      
      // Calculate split dynamically to match currentStock (Source of Truth)
      // Assumption: Dimple stock is static/reserved, sales happen from Deepak (Main)
      // This fixes the issue where global stock decreases on sale but store split remains old.
      let dimpleStock = storeData ? storeData.dimpleStock : 0;
      
      // Safety: If dimple stock is recorded as higher than total current stock, clamp it.
      if (dimpleStock > currentStock) {
        dimpleStock = currentStock;
      }
      
      // Deepak stock is the remainder
      const deepakStock = currentStock - dimpleStock;

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        currentStock: currentStock,
        deepakStock,
        dimpleStock,
        orderedQty: orderedQty, // Total Required in Pending
        needed: needed,         // Net Shortage (To Print)
        costPrice: p.costPrice
      };
    }).filter(item => item.orderedQty > 0); 

    list.sort((a, b) => b.needed - a.needed);

    return { 
      requirements: list, 
      pendingOrderCount: activeOrders.length,
      dateRange: dateRangeStr
    };
  }, [products, orders, storeStocks]);

  // Auto-calculate logistics when requirements change, but respect existing user edits
  useEffect(() => {
    setLogisticsPlan(prevPlan => {
      const nextPlan = { ...prevPlan };
      let hasChanges = false;
      
      requirements.forEach(item => {
        // Only calculate default if we don't have a plan for this item yet
        if (!nextPlan[item.id]) {
          if (item.needed > 0) {
            // Needs printing/buying, so we don't carry from store stock
            nextPlan[item.id] = { productId: item.id, carryDeepak: 0, carryDimple: 0 };
          } else {
            // We have enough total stock, but we need to physically carry it to the printing desk
            
            let remainingNeed = item.orderedQty;
            
            // Strategy: Take from Deepak first, then Dimple
            let takeDeepak = 0;
            let takeDimple = 0;

            if (item.deepakStock >= remainingNeed) {
              takeDeepak = remainingNeed;
              remainingNeed = 0;
            } else {
              takeDeepak = item.deepakStock;
              remainingNeed -= item.deepakStock;
            }

            if (remainingNeed > 0) {
              if (item.dimpleStock >= remainingNeed) {
                takeDimple = remainingNeed;
                remainingNeed = 0;
              } else {
                takeDimple = item.dimpleStock;
                remainingNeed -= item.dimpleStock;
              }
            }

            nextPlan[item.id] = { 
              productId: item.id, 
              carryDeepak: takeDeepak, 
              carryDimple: takeDimple 
            };
          }
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        v2.saveLogisticsPlan(nextPlan);
        return nextPlan;
      }
      return prevPlan;
    });
  }, [requirements]);

  const updateLogistics = (productId: string, field: 'carryDeepak' | 'carryDimple', val: string) => {
    const num = parseInt(val) || 0;
    setLogisticsPlan(prev => {
      const updated = {
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: num
        }
      };
      v2.saveLogisticsPlan(updated); // Persist immediately on edit
      return updated;
    });
  };

  const handleResetLogistics = () => {
    if (window.confirm("Recalculate logistics plan? This will reset your manual carry edits based on current stock.")) {
      const freshPlan: Record<string, LogisticsItem> = {};
      
      requirements.forEach(item => {
          if (item.needed > 0) {
             // Shortage: No carry plan needed (or 0)
             freshPlan[item.id] = { productId: item.id, carryDeepak: 0, carryDimple: 0 };
          } else {
             // We have enough stock total, distribute it
             let remainingNeed = item.orderedQty;
             let takeDeepak = 0;
             let takeDimple = 0;

             // Logic: Deepak First
             if (item.deepakStock >= remainingNeed) {
                takeDeepak = remainingNeed;
                remainingNeed = 0;
             } else {
                takeDeepak = item.deepakStock;
                remainingNeed -= item.deepakStock;
             }

             // Then Dimple
             if (remainingNeed > 0) {
                if (item.dimpleStock >= remainingNeed) {
                   takeDimple = remainingNeed;
                   remainingNeed = 0;
                } else {
                   takeDimple = item.dimpleStock;
                   remainingNeed -= item.dimpleStock;
                }
             }

             freshPlan[item.id] = { 
               productId: item.id, 
               carryDeepak: takeDeepak, 
               carryDimple: takeDimple 
             };
          }
      });
      
      setLogisticsPlan(freshPlan);
      v2.saveLogisticsPlan(freshPlan);
    }
  };

  const getLogisticsSummary = () => {
    const deepakList: Array<{name: string, qty: number}> = [];
    const dimpleList: Array<{name: string, qty: number}> = [];

    requirements.forEach(item => {
      const plan = logisticsPlan[item.id];
      if (plan) {
        if (plan.carryDeepak > 0) deepakList.push({ name: item.name, qty: plan.carryDeepak });
        if (plan.carryDimple > 0) dimpleList.push({ name: item.name, qty: plan.carryDimple });
      }
    });

    return { deepakList, dimpleList };
  };

  const { deepakList, dimpleList } = getLogisticsSummary();

  return (
    <div className="space-y-6">
      
      {/* Context Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 shadow-sm">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-800 font-bold">
              Aggregating {pendingOrderCount} Pending Orders
            </p>
            <div className="flex items-center gap-2 text-xs text-blue-600 mt-0.5">
              <Calendar className="w-3 h-3" />
              <span>Orders from: {dateRange}</span>
            </div>
            <p className="text-[10px] text-blue-500 mt-1 italic">
              Updates in 'Orders' tab reflect here automatically.
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

      {/* List */}
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FileDigit className="w-4 h-4 text-gray-500" />
              Requirement Calculation
            </h3>
            <Badge>{requirements.length} Items</Badge>
          </div>
          <button 
             onClick={handleResetLogistics}
             className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded-lg transition-colors border border-blue-200"
          >
             <RefreshCw className="w-3 h-3" /> Reset Plan
          </button>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-gray-50">
          {requirements.map((item) => {
              const plan = logisticsPlan[item.id] || { carryDeepak: 0, carryDimple: 0 };
              const totalCarried = plan.carryDeepak + plan.carryDimple;
              const isFulfilled = totalCarried >= item.orderedQty;

              return (
              <div key={item.id} className={`p-4 ${item.needed > 0 ? "bg-red-50/30" : "bg-white"}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                    <span className="text-[10px] text-gray-500 uppercase font-bold">{item.category}</span>
                  </div>
                  <div className="text-right">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">Need</span>
                      <span className="text-xl font-bold text-gray-900">{item.orderedQty}</span>
                  </div>
                </div>

                {/* Stock Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                      <span className="block text-blue-800 font-bold">Deepak</span>
                      <span className="block text-blue-600">Stock: {item.deepakStock}</span>
                    </div>
                    <div className="bg-purple-50 p-2 rounded border border-purple-100">
                      <span className="block text-purple-800 font-bold">Dimple</span>
                      <span className="block text-purple-600">Stock: {item.dimpleStock}</span>
                    </div>
                </div>

                {/* Logistics Input */}
                {item.needed <= 0 && (
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Carry Plan</p>
                    <div className="flex gap-2">
                        <div className="flex-1">
                          <input 
                            type="number" 
                            className="w-full text-xs border border-gray-300 rounded p-1" 
                            placeholder="From Deepak"
                            value={plan.carryDeepak}
                            onChange={e => updateLogistics(item.id, 'carryDeepak', e.target.value)}
                          />
                          <span className="text-[9px] text-gray-400">Deepak</span>
                        </div>
                        <div className="flex-1">
                          <input 
                            type="number" 
                            className="w-full text-xs border border-gray-300 rounded p-1" 
                            placeholder="From Dimple"
                            value={plan.carryDimple}
                            onChange={e => updateLogistics(item.id, 'carryDimple', e.target.value)}
                          />
                          <span className="text-[9px] text-gray-400">Dimple</span>
                        </div>
                    </div>
                    <div className={`text-right text-[10px] font-bold mt-1 ${isFulfilled ? 'text-emerald-600' : 'text-orange-500'}`}>
                        Total Carry: {totalCarried} / {item.orderedQty}
                    </div>
                  </div>
                )}

                {item.needed > 0 && (
                    <div className="bg-red-100 p-2 rounded text-center text-xs font-bold text-red-700">
                      Shortage: Print {item.needed} New Copies
                    </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Need</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Breakdown</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-brand-600 uppercase tracking-wider">Logistics (Carry Plan)</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-red-600 uppercase tracking-wider">Shortage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requirements.map((item) => {
                const plan = logisticsPlan[item.id] || { carryDeepak: 0, carryDimple: 0 };
                const totalCarried = plan.carryDeepak + plan.carryDimple;
                const isFulfilled = totalCarried >= item.orderedQty;

                return (
                  <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${item.needed > 0 ? "bg-red-50/10" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.category}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-base font-bold text-gray-900">{item.orderedQty}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                          <div className="text-center px-2">
                            <div className="text-xs font-bold text-blue-700">Deepak</div>
                            <div className="text-sm font-mono text-gray-700">{item.deepakStock}</div>
                          </div>
                          <div className="w-px bg-gray-200 h-8"></div>
                          <div className="text-center px-2">
                            <div className="text-xs font-bold text-purple-700">Dimple</div>
                            <div className="text-sm font-mono text-gray-700">{item.dimpleStock}</div>
                          </div>
                      </div>
                      <div className="text-center text-[10px] text-gray-400 mt-1">Total: {item.currentStock}</div>
                    </td>
                    <td className="px-6 py-4">
                      {item.needed <= 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input 
                                type="number" 
                                className="w-16 text-center border border-blue-200 rounded p-1 text-sm bg-blue-50/30 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-500"
                                value={plan.carryDeepak}
                                onChange={e => updateLogistics(item.id, 'carryDeepak', e.target.value)}
                              />
                              <span className="absolute -bottom-3 left-0 right-0 text-[8px] text-center text-blue-400 font-bold">DEEPAK</span>
                            </div>
                            <span className="text-gray-300 font-bold">+</span>
                            <div className="relative">
                              <input 
                                type="number" 
                                className="w-16 text-center border border-purple-200 rounded p-1 text-sm bg-purple-50/30 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-purple-500"
                                value={plan.carryDimple}
                                onChange={e => updateLogistics(item.id, 'carryDimple', e.target.value)}
                              />
                              <span className="absolute -bottom-3 left-0 right-0 text-[8px] text-center text-purple-400 font-bold">DIMPLE</span>
                            </div>
                            <div className="ml-2">
                                <span className="text-xs font-bold text-gray-400">=</span>
                                <span className={`ml-1 text-sm font-bold ${isFulfilled ? 'text-emerald-600' : 'text-orange-500'}`}>{totalCarried}</span>
                                {!isFulfilled && <AlertTriangle className="w-3 h-3 text-orange-500 inline ml-1" />}
                            </div>
                          </div>
                      ) : (
                          <span className="text-xs text-gray-400 italic">Purchase/Print required</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.needed > 0 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-red-100 text-red-700 gap-1.5 shadow-sm animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {item.needed} To Print
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-lg">
                            Stock OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          <Card className="p-0 border-l-4 border-l-blue-500 overflow-hidden">
            <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center gap-3">
                <Truck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-blue-900">Pickup from Deepak (Dewas)</h3>
            </div>
            <div className="p-4">
                {deepakList.length > 0 ? (
                  <ul className="space-y-2">
                    {deepakList.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                          <span className="font-medium text-gray-700">{item.name}</span>
                          <Badge color="blue">{item.qty} units</Badge>
                        </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">Nothing to pick up.</p>
                )}
            </div>
          </Card>

          <Card className="p-0 border-l-4 border-l-purple-500 overflow-hidden">
            <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center gap-3">
                <Truck className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-900">Pickup from Dimple (Indore)</h3>
            </div>
            <div className="p-4">
                {dimpleList.length > 0 ? (
                  <ul className="space-y-2">
                    {dimpleList.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                          <span className="font-medium text-gray-700">{item.name}</span>
                          <Badge color="gray">{item.qty} units</Badge>
                        </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">Nothing to pick up.</p>
                )}
            </div>
          </Card>
      </div>
    </div>
  );
};
