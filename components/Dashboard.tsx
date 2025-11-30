import React, { useMemo, useState } from 'react';
import { Order, OrderStatus } from '../types';
import { Card, Button, Input } from './ui/Common';
import { DollarSign, ShoppingBag, Truck, TrendingUp, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface DashboardProps {
  orders: Order[];
}

type DateRange = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

export const Dashboard: React.FC<DashboardProps> = ({ orders }) => {
  const [dateRange, setDateRange] = useState<DateRange>('TODAY');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const filteredOrders = useMemo(() => {
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
        // Start of current week (Sunday)
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

    return orders.filter(o => {
      const orderDate = new Date(o.date);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, dateRange, customStart, customEnd]);
  
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const pendingOrders = filteredOrders.filter(o => o.status === OrderStatus.PENDING).length;
    const deliveredOrders = filteredOrders.filter(o => o.status === OrderStatus.DELIVERED).length;
    const completedOrders = filteredOrders.filter(o => o.status === OrderStatus.COMPLETED).length;

    let revenueCash = 0;
    let revenueOnline = 0;
    let totalProfit = 0;

    filteredOrders.forEach(order => {
      if (order.status === OrderStatus.COMPLETED) {
        revenueCash += order.paymentDetails.cashAmount || 0;
        revenueOnline += order.paymentDetails.onlineAmount || 0;

        // Calculate profit
        let orderCost = 0;
        let orderSell = 0;
        
        order.items.forEach(item => {
          orderCost += item.costPriceSnapshot * item.quantity;
          orderSell += item.sellingPriceSnapshot * item.quantity;
        });
        
        // Profit = (Sell - Cost) - Discount
        const profit = (orderSell - orderCost) - (order.discount || 0);
        totalProfit += profit;
      }
    });

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      completedOrders,
      revenueCash,
      revenueOnline,
      totalRevenue: revenueCash + revenueOnline,
      totalProfit
    };
  }, [filteredOrders]);

  // Prepare chart data based on date range
  const chartData = useMemo(() => {
    // If range is Today or Yesterday, show status breakdown
    if (dateRange === 'TODAY' || dateRange === 'YESTERDAY') {
       return [
        { name: 'Pending', value: stats.pendingOrders, color: '#f59e0b' },
        { name: 'Delivered', value: stats.deliveredOrders, color: '#3b82f6' },
        { name: 'Completed', value: stats.completedOrders, color: '#10b981' },
      ];
    } else {
      // If range is longer, show revenue over time
      // Group by date
      const grouped = filteredOrders.reduce((acc, order) => {
        if (order.status !== OrderStatus.COMPLETED) return acc;
        const dateKey = new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        acc[dateKey] = (acc[dateKey] || 0) + order.totalAmount;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(grouped).map(([name, value]) => ({
        name,
        value,
        color: '#10b981'
      }));
    }
  }, [stats, filteredOrders, dateRange]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          <Calendar className="w-5 h-5 text-gray-500 hidden md:block" />
          {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'YEAR'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                dateRange === range 
                  ? 'bg-brand-600 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === 'TODAY' ? 'Today' : 
               range === 'YESTERDAY' ? 'Yesterday' :
               range.charAt(0) + range.slice(1).toLowerCase()}
            </button>
          ))}
          <button
              onClick={() => setDateRange('CUSTOM')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                dateRange === 'CUSTOM' 
                  ? 'bg-brand-600 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Custom
          </button>
        </div>

        {dateRange === 'CUSTOM' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input 
              type="date" 
              className="border rounded px-2 py-1 text-sm w-full md:w-auto"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span className="text-gray-400">-</span>
            <input 
              type="date" 
              className="border rounded px-2 py-1 text-sm w-full md:w-auto"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 border-l-4 border-brand-500">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-xs md:text-sm font-medium text-gray-500 truncate">Total Orders</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
            <div className="p-2 bg-brand-50 rounded-full shrink-0">
              <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-brand-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-xs md:text-sm font-medium text-gray-500 truncate">Revenue</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toFixed(0)}</p>
              <p className="text-[10px] md:text-xs text-gray-500 truncate">Cash: {stats.revenueCash} | Onl: {stats.revenueOnline}</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-full shrink-0">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-xs md:text-sm font-medium text-gray-500 truncate">Profit</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">₹{stats.totalProfit.toFixed(0)}</p>
            </div>
            <div className="p-2 bg-indigo-50 rounded-full shrink-0">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
            </div>
          </div>
        </Card>

         <Card className="p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-xs md:text-sm font-medium text-gray-500 truncate">Pending</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
            </div>
            <div className="p-2 bg-orange-50 rounded-full shrink-0">
              <Truck className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {(dateRange === 'TODAY' || dateRange === 'YESTERDAY') ? 'Status Overview' : 'Revenue Trend'}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
           <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Breakdown</h3>
           <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <div className="p-3 bg-green-100 rounded-full mr-4">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Cash Collected</p>
                  <p className="text-xl font-bold text-gray-900">₹{stats.revenueCash.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <div className="p-3 bg-blue-100 rounded-full mr-4">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Online Collected</p>
                  <p className="text-xl font-bold text-gray-900">₹{stats.revenueOnline.toFixed(2)}</p>
                </div>
              </div>
           </div>
        </Card>
      </div>
    </div>
  );
};