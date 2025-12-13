
import React, { useState, useEffect } from 'react';
import { Product, StoreStock } from '../types';
import { v2, getProducts } from '../services/storage';
import { Card, Button } from './ui/Common';
import { Save, RefreshCw, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export const StoreHouseStock: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<StoreStock[]>([]);
  const [editedStocks, setEditedStocks] = useState<Record<string, { deepak: number, dimple: number }>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const prods = getProducts();
    const currentStocks = v2.getStoreStocks();
    setProducts(prods);
    setStocks(currentStocks);

    // Initialize edit state
    const initialEditState: Record<string, { deepak: number, dimple: number }> = {};
    prods.forEach(p => {
      const stock = currentStocks.find(s => s.productId === p.id);
      if (stock) {
        initialEditState[p.id] = { deepak: stock.deepakStock, dimple: stock.dimpleStock };
      } else {
        // If no store record, default logic: 
        // Put all existing quantity in Deepak (Dewas) as default or split? 
        // Let's default to Deepak for simplicity if migration hasn't happened.
        initialEditState[p.id] = { deepak: p.quantity, dimple: 0 };
      }
    });
    setEditedStocks(initialEditState);
  };

  const handleChange = (productId: string, store: 'deepak' | 'dimple', value: string) => {
    const numVal = parseInt(value) || 0;
    setEditedStocks(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [store]: numVal
      }
    }));
  };

  const handleSave = (productId: string) => {
    const data = editedStocks[productId];
    if (data) {
      v2.updateStoreStock(productId, data.deepak, data.dimple);
      // Reload to reflect total update in product list if needed
      loadData();
      alert('Stock updated successfully!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-soft border border-gray-100">
        <div>
           <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
             <MapPin className="w-5 h-5 text-brand-500" />
             Store House Management
           </h2>
           <p className="text-xs text-gray-500">Manage stock distribution between Dewas & Indore</p>
        </div>
        <Button size="sm" variant="ghost" icon={RefreshCw} onClick={loadData}>Refresh</Button>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 text-xs font-bold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-4 text-left">Product Name</th>
                <th className="px-6 py-4 text-center bg-blue-50/30 text-blue-800">Deepak (Dewas)</th>
                <th className="px-6 py-4 text-center bg-purple-50/30 text-purple-800">Dimple (Indore)</th>
                <th className="px-6 py-4 text-center font-extrabold text-gray-700">Total</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => {
                const stock = editedStocks[p.id] || { deepak: 0, dimple: 0 };
                const total = stock.deepak + stock.dimple;
                
                return (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50/30">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.category}</p>
                    </td>
                    <td className="px-6 py-4 text-center bg-blue-50/10">
                      <input 
                        type="number" 
                        min="0"
                        className="w-20 text-center border border-blue-200 rounded-lg py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700 bg-white"
                        value={stock.deepak}
                        onChange={(e) => handleChange(p.id, 'deepak', e.target.value)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center bg-purple-50/10">
                      <input 
                        type="number" 
                        min="0"
                        className="w-20 text-center border border-purple-200 rounded-lg py-1.5 focus:ring-2 focus:ring-purple-500 outline-none font-bold text-purple-700 bg-white"
                        value={stock.dimple}
                        onChange={(e) => handleChange(p.id, 'dimple', e.target.value)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block min-w-[3rem] py-1 px-2 bg-gray-100 rounded-lg font-bold text-gray-800">
                        {total}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Button size="sm" onClick={() => handleSave(p.id)} icon={Save} className="shadow-lg shadow-brand-500/20">
                         Save
                       </Button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
