
import React, { useState, useEffect } from 'react';
import { Category } from '../types';
import { v2 } from '../services/storage';
import { Button, Input, Modal } from './ui/Common';
import { Tag, Trash2 } from 'lucide-react';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (catId: string) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ isOpen, onClose, onSelect }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');

  const loadCats = () => setCategories(v2.getCategories());
  useEffect(() => { if (isOpen) loadCats(); }, [isOpen]);

  const handleAdd = () => {
    if (!newCatName) return;
    v2.addCategory({ id: crypto.randomUUID(), name: newCatName, color: 'gray' });
    setNewCatName('');
    loadCats();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this category?')) {
      v2.deleteCategory(id);
      loadCats();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories">
      <div className="space-y-4">
        <div className="flex gap-2">
           <Input placeholder="New Category Name" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="mb-0" />
           <Button onClick={handleAdd} size="sm">Add</Button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
           {categories.map(c => (
             <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
               <div className="flex items-center gap-2">
                 <Tag className="w-4 h-4 text-gray-400" />
                 <span className="font-bold text-gray-700 text-sm">{c.name}</span>
               </div>
               <div className="flex items-center gap-2">
                 {onSelect && (
                   <Button size="sm" variant="ghost" onClick={() => { onSelect(c.id); onClose(); }}>Select</Button>
                 )}
                 <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                   <Trash2 className="w-4 h-4" />
                 </button>
               </div>
             </div>
           ))}
        </div>
      </div>
    </Modal>
  );
};
