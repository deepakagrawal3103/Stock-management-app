
import React, { useMemo, useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { v2 } from '../services/storage'; // Import V2 for partial payments
import { Card } from './ui/Common';
import { DollarSign, ShoppingBag, Truck, TrendingUp, Calendar, Filter, ArrowUpRight, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface DashboardProps {
  orders: Order[];
  onNavigate?: (page: string) => void;
}

type DateRange = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

export const Dashboard: React.FC<DashboardProps> = ({ orders, onNavigate }) => {
  const [dateRange, setDateRange] = useState<DateRange>('TODAY');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const filteredStats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (dateRange) {
      case 'TODAY':
        startDate = startOfDay;
        break;
      case 'YESTERDAY':
        startDate = new Date(startOfDay);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'WEEK':
        startDate = new Date(startOfDay);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        break;
      case 'MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'YEAR':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'CUSTOM':
        startDate = customStart ? new Date(customStart) : new Date(0);
        endDate = customEnd ? new Date(customEnd) : new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = startOfDay;
    }

    let revenueCash = 0;
    let revenueOnline = 0;
    let totalProfit = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let deliveredCount = 0;
    let totalPendingCount = 0; // Track total pending irrespective of date range

    if (!orders) return {
        totalOrders: 0, pendingOrders: 0, deliveredOrders: 0, completedOrders: 0,
        revenueCash: 0, revenueOnline: 0, totalRevenue: 0, totalProfit: 0,
        partialCash: 0, partialOnline: 0, totalPendingCount: 0
    };

    orders.forEach(o => {
      // Calculate Global Pending (Total Backlog)
      if (o.status === OrderStatus.PENDING) {
        totalPendingCount++;
      }

      // Safety check for invalid dates
      const dateStr = o.date || new Date().toISOString();
      const creationDate = new Date(dateStr);
      const completionDate = o.completedAt ? new Date(o.completedAt) : creationDate;
      const isInRangeCreation = creationDate >= startDate && creationDate <= endDate;
      const isInRangeCompletion = completionDate >= startDate && completionDate <= endDate;

      if (o.status === OrderStatus.PENDING) {
         if (isInRangeCreation) pendingCount++;
      } else if (o.status === OrderStatus.DELIVERED) {
         if (isInRangeCreation) deliveredCount++;
      } else if (o.status === OrderStatus.COMPLETED) {
         if (isInRangeCompletion) {
            completedCount++;
            
            const pd = o.paymentDetails || { cashAmount: 0, onlineAmount: 0, totalPaid: 0, method: 'NONE' };
            const paid = pd.totalPaid || 0;
            const remaining = Math.max(0, o.totalAmount - paid);
            const isUnpaid = remaining > 1; // Tolerance for float

            // Revenue Calc (Cash flow basis - always count what we received)
            if (pd.cashAmount || pd.onlineAmount) {
                revenueCash += (pd.cashAmount || 0);
                revenueOnline += (pd.onlineAmount || 0);
            } else if (pd.totalPaid > 0) {
               if (pd.method === 'CASH') revenueCash += pd.totalPaid;
               else revenueOnline += pd.totalPaid;
            }

            // Profit Calc: Exclude profit if order is Unpaid (as per request)
            if (!isUnpaid) {
               let orderCost = 0;
               let orderSell = 0;
               if (o.items && Array.isArray(o.items)) {
                   o.items.forEach(item => {
                   orderCost += (item.costPriceSnapshot || 0) * (item.quantity || 0);
                   orderSell += (item.sellingPriceSnapshot || 0) * (item.quantity || 0);
                   });
               }
               const profit = (orderSell - orderCost) - (o.discount || 0);
               totalProfit += profit;
            }
         }
      }
    });

    // --- V2 Partial Payments Calculation (Additive) ---
    const partials = v2.getPartialPayments();
    let partialCash = 0;
    let partialOnline = 0;
    partials.forEach(p => {
      const pDate = new Date(p.createdAt);
      if (pDate >= startDate && pDate <= endDate) {
        if (p.method === 'CASH') partialCash += p.amount;
        else partialOnline += p.amount;
      }
    });

    return {
      totalOrders: pendingCount + deliveredCount + completedCount,
      pendingOrders: pendingCount,
      deliveredOrders: deliveredCount,
      completedOrders: completedCount,
      revenueCash,
      revenueOnline,
      totalRevenue: revenueCash + revenueOnline,
      totalProfit,
      partialCash, 
      partialOnline,
      totalPendingCount // Return total pending
    };
  }, [orders, dateRange, customStart, customEnd]);

  const chartData = useMemo(() => {
    if (dateRange === 'TODAY' || dateRange === 'YESTERDAY') {
       return [
        { name: 'Pending', value: filteredStats.pendingOrders, color: '#f59e0b' },
        { name: 'Delivered', value: filteredStats.deliveredOrders, color: '#3b82f6' },
        { name: 'Completed', value: filteredStats.completedOrders, color: '#10b981' },
      ];
    } else {
       return [
         { name: 'Cash', value: filteredStats.revenueCash + filteredStats.partialCash, color: '#16a34a' },
         { name: 'Online', value: filteredStats.revenueOnline + filteredStats.partialOnline, color: '#2563eb' }
       ];
    }
  }, [filteredStats, dateRange]);

  return (
    <div className="space-y-6">
      
      {/* Date Filter Bar */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 no-scrollbar">
          {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'YEAR'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                dateRange === range 
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {range === 'TODAY' ? 'Today' : 
               range === 'YESTERDAY' ? 'Yesterday' :
               range.charAt(0) + range.slice(1).toLowerCase()}
            </button>
          ))}
          <button
              onClick={() => setDateRange('CUSTOM')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                dateRange === 'CUSTOM' 
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Custom
          </button>
        </div>

        {dateRange === 'CUSTOM' && (
          <div className="flex items-center gap-2 w-full md:w-auto px-2">
            <input 
              type="date" 
              className="border rounded-lg px-2 py-1.5 text-xs bg-gray-50"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span className="text-gray-400">-</span>
            <input 
              type="date" 
              className="border rounded-lg px-2 py-1.5 text-xs bg-gray-50"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Revenue"
          value={`₹${(filteredStats.totalRevenue + filteredStats.partialCash + filteredStats.partialOnline).toFixed(0)}`}
          subValue={`Including partials`}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard 
          title="Total Profit"
          value={`₹${filteredStats.totalProfit.toFixed(0)}`}
          subValue="Est. earnings"
          icon={TrendingUp}
          color="indigo"
        />
        <div onClick={() => onNavigate?.('PENDING_PAGE')} className="cursor-pointer transition-transform active:scale-95">
          <StatCard 
            title="Pending Orders"
            value={filteredStats.totalPendingCount.toString()}
            subValue="Total active backlog"
            icon={Truck}
            color="amber"
          />
        </div>
        <StatCard 
          title="Completed"
          value={filteredStats.completedOrders.toString()}
          subValue="Finished jobs"
          icon={ShoppingBag}
          color="brand"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            {(dateRange === 'TODAY' || dateRange === 'YESTERDAY') ? 'Status Overview' : 'Revenue Breakdown'}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
           <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
             <DollarSign className="w-4 h-4 text-gray-400" />
             Detailed Payment Summary
           </h3>
           <div className="space-y-4">
              <div className="flex items-center p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                <div className="p-3 bg-emerald-100 rounded-xl mr-4 text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Cash Collected</p>
                    {filteredStats.partialCash > 0 && <span className="text-[10px] bg-emerald-200 px-1.5 rounded text-emerald-800">+₹{filteredStats.partialCash} partials</span>}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">₹{(filteredStats.revenueCash + filteredStats.partialCash).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                <div className="p-3 bg-blue-100 rounded-xl mr-4 text-blue-600">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Online Collected</p>
                    {filteredStats.partialOnline > 0 && <span className="text-[10px] bg-blue-200 px-1.5 rounded text-blue-800">+₹{filteredStats.partialOnline} partials</span>}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">₹{(filteredStats.revenueOnline + filteredStats.partialOnline).toFixed(2)}</p>
                </div>
              </div>
              {(filteredStats.partialCash > 0 || filteredStats.partialOnline > 0) && (
                 <div className="text-xs text-center text-gray-400 pt-2 border-t border-dashed border-gray-200">
                    Includes partial payments from incomplete orders.
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subValue, icon: Icon, color }: any) => {
  const bgGradient = {
    emerald: "from-emerald-500 to-teal-500",
    indigo: "from-indigo-500 to-violet-500",
    amber: "from-amber-400 to-orange-500",
    brand: "from-brand-500 to-cyan-500",
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br ${(bgGradient as any)[color]}`}
    >
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <p className="text-white/80 text-xs font-bold uppercase tracking-wider">{title}</p>
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
             <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-white/70 mt-1 font-medium">{subValue}</p>
      </div>
      
      {/* Decorative Circles */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full blur-xl pointer-events-none" />
    </div>
  );
}
