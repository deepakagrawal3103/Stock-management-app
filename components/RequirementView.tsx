import React, { useMemo } from 'react';
import { Product, Order, OrderStatus } from '../types';
import { Card } from './ui/Common';
import { Printer } from 'lucide-react';

interface RequirementViewProps {
  products: Product[];
  orders: Order[];
}

export const RequirementView: React.FC<RequirementViewProps> = ({ products, orders }) => {

  const requirements = useMemo(() => {
    // 1. Calculate Total Ordered Quantity for Today (active orders)
    // Actually, stock is deducted when order is created in this app.
    // So "Available Stock" in product list ALREADY reflects the subtraction.
    // If Stock is NEGATIVE, that is exactly what we need to print/acquire.
    
    // However, the prompt says: "Needed = max(0, Ordered – Available)".
    // This implies a flow where stock is NOT deducted until later, OR "Available" refers to "Shelf Stock" before orders.
    // Given our implementation (Deduct on Create), the logic for "What to print" is simply:
    // If Quantity < 0, we need to print abs(Quantity).
    // OR if we want to follow prompt logic strictly:
    // We can show how many were ordered today vs what we have.

    // Let's implement the prompt's table: Product | Ordered Qty | Available | Still Needed

    const today = new Date().toISOString().split('T')[0];
    const todaysOrders = orders.filter(o => o.date.startsWith(today) && o.status !== OrderStatus.COMPLETED); // Only active orders count for "Requirement" usually? Or all? Let's assume all active pending/delivered need fulfillment.

    const productDemand: Record<string, number> = {};

    todaysOrders.forEach(order => {
      order.items.forEach(item => {
        productDemand[item.productId] = (productDemand[item.productId] || 0) + item.quantity;
      });
    });

    return products
      .filter(p => productDemand[p.id] > 0 || p.quantity < 0) // Show if ordered today or if we are in deficit
      .map(p => {
        const orderedQty = productDemand[p.id] || 0;
        // In our app, p.quantity is "Net Stock".
        // If Net Stock is 5, and we ordered 2, it implies we started with 7.
        // If Net Stock is -2, and we ordered 10, it implies we started with 8.
        // Wait, simpler: p.quantity IS the available stock.
        // If p.quantity is negative, that's the deficit.
        
        // Let's align with the prompt's visual request:
        // Needed = max(0, Ordered - (p.quantity + Ordered)) -> This cancels out mathematically if we deducted already.
        
        // Let's interpret "Requirement" as: "Deficit Report".
        // If p.quantity < 0, Needed = Math.abs(p.quantity).
        // If p.quantity >= 0, Needed = 0 (we have enough).
        
        // Prompt specific formula: Needed = max(0, Ordered - Available).
        // Let's assume 'Available' meant 'Stock before today's orders'.
        // Current Stock (p.quantity) = OldStock - Ordered.
        // => OldStock = Current Stock + Ordered.
        // Needed = max(0, Ordered - OldStock) -> This is confusing if we restocked.
        
        // BEST UX APPROACH:
        // "Still Needed" is simply: How many do I need to print RIGHT NOW to fulfill orders and get back to 0 (or safe level)?
        // If Stock is -5, I need 5.
        // If Stock is 2, I need 0.
        
        const needed = p.quantity < 0 ? Math.abs(p.quantity) : 0;
        
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          orderedQty: orderedQty,
          currentStock: p.quantity,
          needed: needed
        };
      })
      .filter(item => item.orderedQty > 0 || item.needed > 0);
      
  }, [products, orders]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
        <Printer className="w-6 h-6 text-blue-600 mt-1" />
        <div>
          <h3 className="text-blue-900 font-semibold">Printing Requirements (Today)</h3>
          <p className="text-blue-700 text-sm">
            Shows products ordered today and stock deficits. If 'Still Needed' is positive, you need to print or acquire more stock immediately to fulfill pending orders.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered Today</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Still Needed</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requirements.map((item) => (
              <tr key={item.id} className={item.needed > 0 ? "bg-red-50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.category}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                  {item.orderedQty}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                  <span className={`${item.currentStock < 0 ? 'text-red-600 font-bold' : 'text-gray-900'}`}>
                    {item.currentStock}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {item.needed > 0 ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">
                      {item.needed} Units
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      In Stock
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {requirements.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                  No printing requirements for today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
};