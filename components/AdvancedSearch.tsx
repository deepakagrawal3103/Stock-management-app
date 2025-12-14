
import React, { useState, useMemo } from 'react';
import { Order, Product } from '../types';
import { Card, Input, Badge } from './ui/Common';
import { Search, Package, ShoppingCart, FileText, X } from 'lucide-react';

interface AdvancedSearchProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  products: Product[];
  roughWork: string;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ isOpen, onClose, orders, products, roughWork }) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query || query.length < 2) return { orders: [], products: [], notes: false };
    const lowerQ = query.toLowerCase();

    const matchedOrders = orders.filter(o => 
      o.customerName.toLowerCase().includes(lowerQ) ||
      o.items.some(i => i.productName.toLowerCase().includes(lowerQ)) ||
      o.note?.toLowerCase().includes(lowerQ) ||
      o.id.includes(lowerQ)
    ).slice(0, 10);

    const matchedProducts = products.filter(p => 
      p.name.toLowerCase().includes(lowerQ) ||
      p.category.toLowerCase().includes(lowerQ)
    ).slice(0, 10);

    const notesMatch = roughWork.toLowerCase().includes(lowerQ);

    return { orders: matchedOrders, products: matchedProducts, notes: notesMatch };
  }, [query, orders, products, roughWork]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center pt-20 px-4">
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[80vh] animate-[fadeIn_0.2s]"
      >
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
           <Search className="w-5 h-5 text-gray-400" />
           <input 
             autoFocus
             className="flex-1 text-lg outline-none placeholder-gray-400"
             placeholder="Search orders, items, notes..."
             value={query}
             onChange={e => setQuery(e.target.value)}
           />
           <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
             <X className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-4">
           {results.products.length > 0 && (
             <div className="space-y-2">
               <h3 className="text-xs font-bold text-gray-500 uppercase ml-1">Stock Items</h3>
               {results.products.map(p => (
                 <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package className="w-4 h-4"/></div>
                       <div>
                         <p className="font-bold text-sm text-gray-900">{p.name}</p>
                         <p className="text-xs text-gray-500">{p.category}</p>
                       </div>
                    </div>
                    <span className="font-mono font-bold">₹{p.sellingPrice}</span>
                 </div>
               ))}
             </div>
           )}

           {results.orders.length > 0 && (
             <div className="space-y-2">
               <h3 className="text-xs font-bold text-gray-500 uppercase ml-1">Orders</h3>
               {results.orders.map(o => (
                 <div key={o.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                         <div className="p-2 bg-brand-50 text-brand-600 rounded-lg"><ShoppingCart className="w-4 h-4"/></div>
                         <div>
                            <p className="font-bold text-sm text-gray-900">{o.customerName}</p>
                            <p className="text-xs text-gray-400">#{o.id.slice(0,5)} • {new Date(o.date).toLocaleDateString()}</p>
                         </div>
                      </div>
                      <Badge color={o.status === 'COMPLETED' ? 'green' : 'yellow'}>{o.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 pl-11 line-clamp-1">
                       {o.items.map(i => i.productName).join(', ')}
                    </p>
                 </div>
               ))}
             </div>
           )}

           {results.notes && (
             <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center gap-3">
                <FileText className="w-5 h-5 text-amber-600" />
                <p className="text-sm text-amber-800 font-medium">Found "{query}" in your Rough Work notes.</p>
             </div>
           )}

           {!query && (
             <div className="text-center text-gray-400 py-12">
                Type to start searching...
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
