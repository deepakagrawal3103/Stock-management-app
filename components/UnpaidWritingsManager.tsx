
import React, { useState, useEffect, useMemo } from 'react';
import { UnpaidWriting } from '../types';
import { v2 } from '../services/storage';
import { Button, Card, Input, Modal, Badge, Textarea } from './ui/Common';
import { RoughWork } from './RoughWork'; // Integrated Rough Work
import { Plus, Trash2, CheckCircle, AlertTriangle, Book, PenTool, Search, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const UnpaidWritingsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CREDIT' | 'ROUGH'>('CREDIT');
  const [writings, setWritings] = useState<UnpaidWriting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWriting, setNewWriting] = useState<Partial<UnpaidWriting>>({
    title: '', description: '', amount: 0, category: 'Unpaid'
  });

  const loadData = () => {
    setWritings(v2.getUnpaidWritings().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = () => {
    if (!newWriting.title || !newWriting.amount) return;
    
    const item: UnpaidWriting = {
      id: crypto.randomUUID(),
      title: newWriting.title || 'Unknown',
      description: newWriting.description || '',
      amount: Number(newWriting.amount),
      category: newWriting.category || 'Unpaid',
      createdAt: new Date().toISOString(),
      status: 'UNPAID'
    };

    v2.addUnpaidWriting(item);
    setIsModalOpen(false);
    setNewWriting({ title: '', description: '', amount: 0, category: 'Unpaid' });
    loadData();
  };

  const markAsPaid = (id: string) => {
    const item = writings.find(w => w.id === id);
    if (item) {
      v2.updateUnpaidWriting({ ...item, status: 'PAID' });
      loadData();
    }
  };

  const handleDelete = (id: string) => {
    if(confirm('Delete this record?')) {
      v2.deleteUnpaidWriting(id);
      loadData();
    }
  };

  const filteredWritings = useMemo(() => {
    return writings.filter(w => 
      w.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      w.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [writings, searchTerm]);

  const totalUnpaid = writings.filter(w => w.status === 'UNPAID').reduce((sum, w) => sum + w.amount, 0);
  const unpaidCount = writings.filter(w => w.status === 'UNPAID').length;

  return (
    <div className="space-y-6">
       {/* Tabs */}
       <div className="flex p-1 bg-white border border-gray-200 rounded-xl w-full max-w-md mx-auto shadow-sm sticky top-20 z-20">
        <button
          onClick={() => setActiveTab('CREDIT')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'CREDIT' ? 'bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Book className="w-4 h-4" /> Credit Book
          {unpaidCount > 0 && (
             <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-[10px] min-w-[1.25rem] text-center font-bold">
               {unpaidCount}
             </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ROUGH')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'ROUGH' ? 'bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PenTool className="w-4 h-4" /> Scratchpad
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'ROUGH' ? (
           <motion.div key="rough" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-[70vh]">
             <RoughWork />
           </motion.div>
        ) : (
          <motion.div key="credit" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 bg-red-50 border-red-100 flex items-center justify-between">
                <div>
                  <h3 className="text-red-800 font-bold uppercase text-xs tracking-wider">Total Unpaid Amount</h3>
                  <p className="text-3xl font-bold text-red-600 mt-1">₹{totalUnpaid.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-white rounded-full shadow-sm text-red-500">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </Card>
              <Card className="p-6 bg-emerald-50 border-emerald-100 flex items-center justify-between">
                <div>
                  <h3 className="text-emerald-800 font-bold uppercase text-xs tracking-wider">Recovered (Paid)</h3>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">₹{writings.filter(w => w.status === 'PAID').reduce((sum, w) => sum + w.amount, 0).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-white rounded-full shadow-sm text-emerald-500">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </Card>
            </div>

            {/* Actions Bar with Sticky Search */}
            <div className="sticky top-32 z-10 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-soft border border-gray-100 flex gap-2">
              <div className="relative flex-1">
                 <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                 <input 
                    type="text" 
                    placeholder="Search records..." 
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
                 {searchTerm && (
                   <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                     <X className="w-4 h-4" />
                   </button>
                 )}
              </div>
              <Button onClick={() => setIsModalOpen(true)} icon={Plus} className="shadow-lg shadow-brand-500/20 whitespace-nowrap shrink-0">
                Add Record
              </Button>
            </div>

            <div className="grid gap-3">
              {filteredWritings.map((item) => (
                <Card key={item.id} className={`p-4 border-l-4 ${item.status === 'UNPAID' ? 'border-l-red-500' : 'border-l-emerald-500'} transition-all hover:shadow-md`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold text-lg ${item.status === 'PAID' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.title}</h3>
                        <Badge color={item.status === 'UNPAID' ? 'red' : 'green'}>{item.status}</Badge>
                        {item.relatedOrderId && <Badge color="blue">Order Linked</Badge>}
                      </div>
                      <p className="text-sm text-gray-500">{item.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                         <Calendar className="w-3 h-3 text-gray-400" />
                         <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">₹{item.amount}</p>
                      <div className="flex gap-2 mt-3 justify-end">
                        {item.status === 'UNPAID' && (
                          <Button size="sm" variant="success" onClick={() => markAsPaid(item.id)} icon={CheckCircle}>Mark Paid</Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => handleDelete(item.id)} icon={Trash2} />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredWritings.length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                   {searchTerm ? 'No matching records found.' : 'No unpaid records found.'}
                </div>
              )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Unpaid Writing">
              <div className="space-y-4">
                <Input label="Title" value={newWriting.title} onChange={e => setNewWriting({...newWriting, title: e.target.value})} placeholder="e.g. Ramesh Credits" autoFocus />
                <Input label="Amount" type="number" value={newWriting.amount} onChange={e => setNewWriting({...newWriting, amount: parseFloat(e.target.value)})} />
                <Textarea label="Description" value={newWriting.description} onChange={e => setNewWriting({...newWriting, description: e.target.value})} placeholder="Optional details..." />
                <Button onClick={handleSave} className="w-full mt-4">Save Record</Button>
              </div>
            </Modal>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
