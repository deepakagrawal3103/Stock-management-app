
import React, { useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import { Card, Button } from './ui/Common';
import { ArrowLeft, Truck, TrendingUp, DollarSign } from 'lucide-react';

interface PendingOrdersPageProps {
  orders: Order[];
  onBack: () => void;
}

export const PendingOrdersPage: React.FC<PendingOrdersPageProps> = ({ orders, onBack }) => {
  const pendingOrders = useMemo(() => orders.filter(o => o.status === OrderStatus.PENDING), [orders]);

  const stats = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    
    pendingOrders.forEach(o => {
      totalValue += o.totalAmount;
      o.items.forEach(i => {
        totalCost += (i.costPriceSnapshot * i.quantity);
      });
    });

    return {
      count: pendingOrders.length,
      value: totalValue,
      profit: totalValue - totalCost
    };
  }, [pendingOrders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>Back</Button>
        <h2 className="text-2xl font-bold text-gray-900">Pending Orders</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-white to-orange-50 border-l-4 border-l-orange-500">
           <div className="flex items-center gap-3">
             <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><Truck className="w-6 h-6"/></div>
             <div>
               <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Total Pending</p>
               <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
             </div>
           </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-white to-blue-50 border-l-4 border-l-blue-500">
           <div className="flex items-center gap-3">
             <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><DollarSign className="w-6 h-6"/></div>
             <div>
               <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Value</p>
               <p className="text-2xl font-bold text-gray-900">₹{stats.value.toFixed(0)}</p>
             </div>
           </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-white to-emerald-50 border-l-4 border-l-emerald-500">
           <div className="flex items-center gap-3">
             <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><TrendingUp className="w-6 h-6"/></div>
             <div>
               <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Est. Profit</p>
               <p className="text-2xl font-bold text-gray-900">₹{stats.profit.toFixed(0)}</p>
             </div>
           </div>
        </Card>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
         <div className="hidden md:block">
           <table className="w-full text-sm">
             <thead className="bg-gray-50/50 text-xs font-bold text-gray-500 uppercase">
               <tr>
                 <th className="px-6 py-4 text-left">Order ID</th>
                 <th className="px-6 py-4 text-left">Customer</th>
                 <th className="px-6 py-4 text-right">Cost</th>
                 <th className="px-6 py-4 text-right">Value</th>
                 <th className="px-6 py-4 text-right">Profit</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {pendingOrders.map(o => {
                 const cost = o.items.reduce((acc, i) => acc + (i.costPriceSnapshot * i.quantity), 0);
                 const profit = o.totalAmount - cost;
                 return (
                   <tr key={o.id} className="hover:bg-gray-50/50">
                     <td className="px-6 py-4 font-mono text-gray-500">#{o.id.slice(0,6)}</td>
                     <td className="px-6 py-4 font-medium text-gray-900">
                        {o.customerName}
                        <div className="text-xs text-gray-400 font-normal">{new Date(o.date).toLocaleDateString()}</div>
                     </td>
                     <td className="px-6 py-4 text-right text-gray-500">₹{cost.toFixed(0)}</td>
                     <td className="px-6 py-4 text-right font-bold text-gray-900">₹{o.totalAmount.toFixed(0)}</td>
                     <td className="px-6 py-4 text-right font-bold text-emerald-600">+₹{profit.toFixed(0)}</td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
         </div>

         {/* Mobile */}
         <div className="md:hidden divide-y divide-gray-50">
            {pendingOrders.map(o => {
               const cost = o.items.reduce((acc, i) => acc + (i.costPriceSnapshot * i.quantity), 0);
               const profit = o.totalAmount - cost;
               return (
                 <div key={o.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <p className="font-bold text-gray-900">{o.customerName}</p>
                         <p className="text-xs text-gray-400">#{o.id.slice(0,6)}</p>
                       </div>
                       <p className="font-bold text-lg">₹{o.totalAmount}</p>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                       <span>Cost: ₹{cost.toFixed(0)}</span>
                       <span className="font-bold text-emerald-600">Profit: ₹{profit.toFixed(0)}</span>
                    </div>
                 </div>
               );
            })}
         </div>
      </div>
    </div>
  );
};
