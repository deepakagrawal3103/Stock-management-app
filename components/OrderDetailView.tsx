
import React from 'react';
import { Order } from '../types';
import { Modal } from './ui/Common';
import { Package } from 'lucide-react';

interface OrderDetailViewProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ order, isOpen, onClose }) => {
  if (!order) return null;

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Order #${order.id.slice(0, 5)} Details`}>
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{order.customerName}</h3>
              <p className="text-sm text-gray-500">{order.customerPhone}</p>
            </div>
            <div className="text-right">
              <span className="block font-bold text-brand-600 text-xl">₹{order.totalAmount}</span>
              <span className="text-xs text-gray-400">{new Date(order.date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" /> Item Breakdown
          </h4>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 font-bold uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Product / File</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.productName}
                      {item.isCustom && <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Custom</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">× {item.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-500">₹{item.sellingPriceSnapshot * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-3 font-bold text-gray-900">Total Items</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{totalItems}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
