
import React, { useMemo } from 'react';
import { Product, Order, OrderStatus } from '../types';
import { Card } from './ui/Common';
import { Printer, AlertTriangle } from 'lucide-react';

interface RequirementViewProps {
  products: Product[];
  orders: Order[];
}

export const RequirementView: React.FC<RequirementViewProps> = ({ products, orders }) => {

  const { requirements, totalOrderValue } = useMemo(() => {
    // 1. Calculate Total Order Value (All Orders)
    const totalOrderValue = orders.reduce((acc, o) => acc + o.totalAmount, 0);

    // 2. Calculate Pending Demand
    // We only care about orders that are PENDING or DELIVERED (not yet fully completed/archived perhaps)
    // Actually, usually "Requirement" is for PENDING orders that need to be produced.
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
      // Formula: Needed = Ordered (Pending) - Current Stock
      // If we have 10 in stock and 5 ordered, Needed = 0 (Surplus 5)
      // If we have 2 in stock and 5 ordered, Needed = 3
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
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
               <Printer className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-blue-800 font-medium">Items to Print/Acquire</p>
              <h3 className="text-2xl font-bold text-blue-900">{requirements.reduce((a,b) => a + b.needed, 0)} Units</h3>
            </div>
         </div>
         <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
               <span className="text-xl font-bold">₹</span>
            </div>
            <div>
              <p className="text-sm text-emerald-800 font-medium">Total Value (All Orders)</p>
              <h3 className="text-2xl font-bold text-emerald-900">₹{totalOrderValue.toFixed(2)}</h3>
            </div>
         </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Stock & Requirement Detail</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">In Stock</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Orders</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Need to Print</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requirements.map((item) => (
              <tr key={item.id} className={item.needed > 0 ? "bg-red-50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.category}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                  <span className={`${item.currentStock < 5 ? 'text-red-600 font-bold' : 'text-gray-900'}`}>
                    {item.currentStock}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                  {item.orderedQty}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {item.needed > 0 ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800 gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {item.needed}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
              </tr>
            ))}
            {requirements.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                  Stock levels are sufficient for all pending orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
