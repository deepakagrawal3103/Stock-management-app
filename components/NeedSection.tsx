
import React, { useState, useEffect, useMemo } from 'react';
import { Product, ManualNeed, Order, OrderStatus } from '../types';
import { v2, getProducts } from '../services/storage';
import { Card, Button, Input, Textarea, Modal } from './ui/Common';
import { ClipboardList, Plus, Trash2, Edit3, AlertCircle } from 'lucide-react';

interface NeedSectionProps {
  orders?: Order[];
}

export const NeedSection: React.FC<NeedSectionProps> = ({ orders = [] }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [needs, setNeeds] = useState<ManualNeed[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNeed, setEditingNeed] = useState<Partial<ManualNeed>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setProducts(getProducts());
    setNeeds(v2.getManualNeeds());
  };

  const handleOpenModal = (need?: ManualNeed) => {
    if (need) {
      setEditingNeed(need);
    } else {
      setEditingNeed({ productId: products[0]?.id || '', totalRequired: 0, note: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingNeed.productId || editingNeed.totalRequired === undefined) return;
    v2.addOrUpdateManualNeed(editingNeed.productId, editingNeed.totalRequired, editingNeed.note || '');
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this need?')) {
      v2.deleteManualNeed(id);
      loadData();
    }
  };

  const totalPendingValue = useMemo(() => {
    return orders
      .filter(o => o.status === OrderStatus.PENDING)
      .reduce((sum, o) => sum + o.totalAmount, 0);
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-2xl shadow-soft border border-gray-100">
        <div>
           <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
             <ClipboardList className="w-5 h-5 text-red-500" />
             Manual Needs
           </h2>
           <p className="text-xs text-gray-500">Track total requirements manually</p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <AlertCircle className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">Pending Order Value</p>
                 <p className="text-lg font-bold text-gray-900">₹{totalPendingValue.toFixed(0)}</p>
              </div>
           </div>
           <Button onClick={() => handleOpenModal()} icon={Plus} className="shadow-lg shadow-brand-500/20">Add Need</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {needs.map(need => {
          const product = products.find(p => p.id === need.productId);
          return (
            <Card key={need.id} className="p-4 border-l-4 border-l-red-500">
               <div className="flex justify-between items-start mb-2">
                 <div>
                   <h3 className="font-bold text-gray-900">{product?.name || 'Unknown Product'}</h3>
                   <span className="text-xs text-gray-400">{product?.category}</span>
                 </div>
                 <div className="text-right">
                   <div className="text-2xl font-bold text-red-600">{need.totalRequired}</div>
                   <div className="text-[10px] uppercase font-bold text-red-400">Needed</div>
                 </div>
               </div>
               
               {need.note && (
                 <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-100 mb-3">
                   <p className="text-xs text-yellow-800 italic">"{need.note}"</p>
                 </div>
               )}

               <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                  <Button size="sm" variant="ghost" onClick={() => handleOpenModal(need)} icon={Edit3}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(need.id)} className="text-red-500" icon={Trash2}>Remove</Button>
               </div>
            </Card>
          );
        })}
        {needs.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
            No manual needs recorded.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingNeed.id ? "Edit Need" : "Add Requirement"}>
         <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Product</label>
              <select 
                className="w-full rounded-xl border-gray-200 bg-gray-50 p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                value={editingNeed.productId}
                onChange={e => setEditingNeed({...editingNeed, productId: e.target.value})}
                disabled={!!editingNeed.id} // Disable product change on edit to avoid confusion
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <Input 
              label="Total Quantity Required" 
              type="number" 
              value={editingNeed.totalRequired} 
              onChange={e => setEditingNeed({...editingNeed, totalRequired: parseInt(e.target.value)})} 
            />
            
            <Textarea 
              label="Note (Reason/Urgency)" 
              value={editingNeed.note} 
              onChange={e => setEditingNeed({...editingNeed, note: e.target.value})} 
              placeholder="e.g. Urgent for internal practical submission"
            />

            <Button onClick={handleSave} className="w-full">Save Requirement</Button>
         </div>
      </Modal>
    </div>
  );
};
