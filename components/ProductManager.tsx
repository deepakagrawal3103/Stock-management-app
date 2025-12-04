
import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { Button, Card, Input, Modal, Badge } from './ui/Common';
import { ExpenseTracker } from './ExpenseTracker';
import { Plus, Edit2, Trash2, Search, AlertTriangle, Package, DollarSign, TrendingUp, Receipt, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductManagerProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) => {
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'EXPENSES'>('INVENTORY');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '', category: '', costPrice: 0, sellingPrice: 0, quantity: 0, minStock: 0
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category: 'General', costPrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      onUpdateProduct({ ...formData, id: editingProduct.id });
    } else {
      onAddProduct({ ...formData, id: crypto.randomUUID() });
    }
    setIsModalOpen(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inventoryValue = useMemo(() => {
    let totalCostVal = 0;
    let totalSellVal = 0;
    products.forEach(p => {
      totalCostVal += (p.quantity * p.costPrice);
      totalSellVal += (p.quantity * p.sellingPrice);
    });
    return { totalCostVal, totalSellVal };
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs */}
      <div className="flex p-1 bg-white border border-gray-200 rounded-xl w-full max-w-md mx-auto shadow-sm">
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'INVENTORY' ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Archive className="w-4 h-4" /> Stock Items
        </button>
        <button
          onClick={() => setActiveTab('EXPENSES')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'EXPENSES' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Receipt className="w-4 h-4" /> Expenses
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'EXPENSES' ? (
          <motion.div 
            key="expenses"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ExpenseTracker />
          </motion.div>
        ) : (
          <motion.div 
            key="inventory"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Inventory Valuation Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-5 border-l-4 border-blue-500 bg-gradient-to-br from-white to-blue-50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white shadow-sm border border-blue-100 text-blue-600 rounded-xl">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Stock Cost Value</p>
                    <p className="text-2xl font-bold text-gray-900">₹{inventoryValue.totalCostVal.toFixed(0)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 border-l-4 border-emerald-500 bg-gradient-to-br from-white to-emerald-50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white shadow-sm border border-emerald-100 text-emerald-600 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Stock Selling Value</p>
                    <p className="text-2xl font-bold text-gray-900">₹{inventoryValue.totalSellVal.toFixed(0)}</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl shadow-soft border border-gray-100 sticky top-20 z-20">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="block w-full pl-9 pr-3 py-2 border-0 bg-gray-50 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 transition-all placeholder-gray-400"
                  placeholder="Search stock..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={() => handleOpenModal()} icon={Plus} className="w-full sm:w-auto shadow-lg shadow-brand-500/30">
                Add Product
              </Button>
            </div>

            <motion.div layout className="grid grid-cols-1 md:hidden gap-3">
              {filteredProducts.map(product => {
                const profit = product.sellingPrice - product.costPrice;
                const isLowStock = product.quantity <= product.minStock;
                const stockSellVal = product.quantity * product.sellingPrice;

                return (
                  <Card key={product.id} className={`p-4 ${isLowStock ? 'ring-2 ring-red-100 bg-red-50/30' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                          <h3 className="font-bold text-gray-900 text-base">{product.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge>{product.category}</Badge>
                            {isLowStock && <Badge color="red">Low Stock</Badge>}
                          </div>
                      </div>
                      <div className="text-right">
                          <span className={`text-2xl font-bold tracking-tight ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>{product.quantity}</span>
                          <div className="text-[10px] font-bold text-gray-400 uppercase">Qty</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm py-3 border-t border-b border-gray-50 my-2">
                        <div>
                          <span className="text-xs text-gray-400 block mb-0.5">Price (Cost/Sell)</span>
                          <span className="font-mono font-medium">₹{product.costPrice} / ₹{product.sellingPrice}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400 block mb-0.5">Profit/Unit</span>
                          <span className="font-medium text-emerald-600">+₹{profit.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-1">
                      <div className="text-xs text-gray-500">
                        Val: <span className="font-medium text-gray-900">₹{stockSellVal.toFixed(0)}</span>
                      </div>
                      <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenModal(product)} icon={Edit2} className="h-8 w-8 p-0" />
                          <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 h-8 w-8 p-0" onClick={() => onDeleteProduct(product.id)} icon={Trash2} />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </motion.div>

            {/* Desktop Table */}
            <Card className="hidden md:block overflow-hidden shadow-soft border-0">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Prices (C/S)</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {filteredProducts.map((product) => {
                    const isLowStock = product.quantity <= product.minStock;
                    const stockSellVal = product.quantity * product.sellingPrice;

                    return (
                      <tr key={product.id} className={`hover:bg-gray-50/50 transition-colors ${isLowStock ? "bg-red-50/20" : ""}`}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.category}</div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-600 font-mono">
                          ₹{product.costPrice} / <span className="text-gray-900 font-bold">₹{product.sellingPrice}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-bold ${isLowStock ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-800'}`}>
                              {product.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-medium text-emerald-700">₹{stockSellVal.toFixed(0)}</div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleOpenModal(product)} className="text-gray-400 hover:text-brand-600 transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => onDeleteProduct(product.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Edit Product" : "New Product"}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <Input label="Category" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Cost (₹)" type="number" step="0.01" required value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value)})} />
                  <Input label="Sell (₹)" type="number" step="0.01" required value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: parseFloat(e.target.value)})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Quantity" type="number" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} />
                  <Input label="Min Stock Alert" type="number" required value={formData.minStock} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value)})} />
                </div>
                <div className="flex justify-end gap-3 pt-6">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1">{editingProduct ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </Modal>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
