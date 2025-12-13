
import React, { useState, useEffect } from 'react';
import { PartialPayment, Order } from '../types';
import { v2 } from '../services/storage';
import { Button, Input, Modal } from './ui/Common';
import { CreditCard, Banknote, History, Split } from 'lucide-react';

interface PartialPaymentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentAdded: () => void;
}

export const PartialPaymentModal: React.FC<PartialPaymentModalProps> = ({ order, isOpen, onClose, onPaymentAdded }) => {
  // Single Payment State
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  
  // Split Payment State
  const [isSplit, setIsSplit] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [onlineAmount, setOnlineAmount] = useState('');

  const [history, setHistory] = useState<PartialPayment[]>([]);

  useEffect(() => {
    if (order && isOpen) {
      setHistory(v2.getPartialPaymentsForOrder(order.id));
      // Reset fields
      setAmount('');
      setCashAmount('');
      setOnlineAmount('');
      setIsSplit(false);
    }
  }, [order, isOpen]);

  const handleAddPayment = () => {
    if (!order) return;

    if (isSplit) {
       const cVal = parseFloat(cashAmount) || 0;
       const oVal = parseFloat(onlineAmount) || 0;
       
       if (cVal <= 0 && oVal <= 0) {
         alert("Please enter at least one amount");
         return;
       }

       const now = new Date().toISOString();
       
       // Add Cash Record
       if (cVal > 0) {
         v2.addPartialPayment({
            id: crypto.randomUUID(),
            orderId: order.id,
            amount: cVal,
            method: 'CASH',
            createdAt: now
         });
       }

       // Add Online Record (slightly offset time to ensure order stability if needed, though mostly fine)
       if (oVal > 0) {
         v2.addPartialPayment({
            id: crypto.randomUUID(),
            orderId: order.id,
            amount: oVal,
            method: 'ONLINE',
            createdAt: now
         });
       }

       setCashAmount('');
       setOnlineAmount('');
    } else {
       const val = parseFloat(amount);
       if (isNaN(val) || val <= 0) return;

       v2.addPartialPayment({
          id: crypto.randomUUID(),
          orderId: order.id,
          amount: val,
          method,
          createdAt: new Date().toISOString()
       });
       setAmount('');
    }

    setHistory(v2.getPartialPaymentsForOrder(order.id));
    onPaymentAdded();
  };

  const totalPaid = history.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = order ? Math.max(0, order.totalAmount - totalPaid) : 0;

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Payments for Order #${order.id.slice(0,5)}`}>
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
           <div>
             <p className="text-xs text-gray-500 font-bold uppercase">Order Total</p>
             <p className="text-xl font-bold text-gray-900">₹{order.totalAmount}</p>
           </div>
           <div className="text-right">
             <p className="text-xs text-gray-500 font-bold uppercase">Remaining</p>
             <p className={`text-xl font-bold ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>₹{remaining.toFixed(2)}</p>
           </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
             <h4 className="text-sm font-bold text-gray-900">Add Payment</h4>
             <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-600">
                <input type="checkbox" checked={isSplit} onChange={e => setIsSplit(e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                Split (Cash + Online)
             </label>
          </div>

          {isSplit ? (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
               <Input 
                 label="Online Amount" 
                 type="number" 
                 value={onlineAmount} 
                 onChange={e => setOnlineAmount(e.target.value)} 
                 placeholder="0.00"
               />
               <Input 
                 label="Cash Amount" 
                 type="number" 
                 value={cashAmount} 
                 onChange={e => setCashAmount(e.target.value)} 
                 placeholder="0.00"
               />
               <Button onClick={handleAddPayment} className="w-full shadow-lg shadow-brand-500/20">Add Split Payment</Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <button 
                  onClick={() => setMethod('CASH')}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold border transition-all ${method === 'CASH' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-500'}`}
                >
                  <Banknote className="w-4 h-4" /> Cash
                </button>
                <button 
                  onClick={() => setMethod('ONLINE')}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold border transition-all ${method === 'ONLINE' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}
                >
                  <CreditCard className="w-4 h-4" /> Online
                </button>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Amount" 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  className="mb-0"
                />
                <Button onClick={handleAddPayment} className="shadow-lg shadow-brand-500/20">Add</Button>
              </div>
            </>
          )}
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-400" /> Payment History
          </h4>
          <div className="border border-gray-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            {history.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400 bg-gray-50">No partial payments recorded.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 font-bold uppercase sticky top-0">
                   <tr>
                     <th className="px-3 py-2 text-left">Date</th>
                     <th className="px-3 py-2 text-left">Method</th>
                     <th className="px-3 py-2 text-right">Amount</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map(p => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 text-gray-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2 font-medium">
                        <span className={`text-xs px-2 py-0.5 rounded ${p.method === 'CASH' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{p.method}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900">₹{p.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
