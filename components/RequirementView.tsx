import React, { useMemo } from 'react';
import { Product, Order, OrderStatus } from '../types';
import { Card } from './ui/Common';
import { Printer, AlertTriangle, Package, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

interface RequirementViewProps {
  products: Product[];
  orders: Order[];
}

export const RequirementView: React.FC<RequirementViewProps> = ({ products, orders }) => {

  const { requirements, totalOrderValue } = useMemo(() => {
    const totalOrderValue = orders.reduce((acc, o) => acc + o.totalAmount, 0);
    const activeOrders = orders.filter(o => o.status === OrderStatus.PENDING);
    
    const productDemand: Record<string, number> = {};
    activeOrders.forEach(order => {
      order.items.forEach(item => {
        if (!item.isCustom) {
          productDemand[item.productId] = (productDemand[item.productId] || 0) + item.quantity;
        }
      });
    });

    const list = products.map(p => {
      const orderedQty = productDemand[p.id] || 0;
      const needed = Math.max(0, orderedQty - p.quantity);

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        currentStock: p.quantity,
        orderedQty: orderedQty,
        needed: needed
      };
    }).filter(item => item.needed > 0 || item.orderedQty > 0);

    return { requirements: list, totalOrderValue };
  }, [products, orders]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-5 rounded-2xl text-white shadow-lg shadow-blue-500/20 flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
               <Printer className="w-6 h-6" />
            </div>
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Total Production Need</p>
              <h3 className="text-3xl font-bold">{requirements.reduce((a,b) => a + b.needed, 0)} <span className="text-lg opacity-80 font-medium">Units</span></h3>
            </div>
         </div>
         <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-soft flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
               <span className="text-xl font-bold">₹</span>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Value (Pending)</p>
              <h3 className="text-2xl font-bold text-gray-900">₹{totalOrderValue.toFixed(0)}</h3>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-900">Production List</h3>
          <span className="text-xs font-bold text-gray-500 bg-white border px-2 py-1 rounded-lg">{requirements.length} Items</span>
        </div>

        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-gray-50">
          {requirements.map((item) => (
            <div key={item.id} className={`p-5 ${item.needed > 0 ? "bg-red-50/40" : "bg-white"}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-gray-900 text-base">{item.name}</h4>
                  <span className="text-xs text-gray-500 font-medium">{item.category}</span>
                </div>
                {item.needed > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    Short {item.needed}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center">
                   <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Stock</div>
                   <div className={`font-bold text-sm ${item.currentStock < 5 ? 'text-red-600' : 'text-gray-900'}`}>{item.currentStock}</div>
                </div>
                <div className="flex-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center">
                   <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Order</div>
                   <div className="font-bold text-sm text-gray-900">{item.orderedQty}</div>
                </div>
                <div className={`flex-1 p-2.5 rounded-xl border text-center ${item.needed > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                   <div className={`text-[10px] uppercase font-bold mb-1 ${item.needed > 0 ? "text-red-600" : "text-gray-400"}`}>Need</div>
                   <div className={`font-bold text-sm ${item.needed > 0 ? "text-red-700" : "text-gray-400"}`}>
                     {item.needed > 0 ? item.needed : '-'}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">In Stock</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Ordered</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Action Needed</th>
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-sm font-bold ${item.currentStock < 5 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-800'}`}>
                      {item.currentStock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                    {item.orderedQty}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.needed > 0 ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-red-100 text-red-700 gap-1.5 shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Print {item.needed}
                      </span>
                    ) : (
                      <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-lg">Fulfilled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};