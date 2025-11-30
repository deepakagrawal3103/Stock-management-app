import React, { useState } from 'react';
import { Product } from '../types';
import { Button, Card, Input, Modal, Badge } from './ui/Common';
import { Plus, Edit2, Trash2, Search, AlertTriangle, Package } from 'lucide-react';

interface ProductManagerProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) => {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => handleOpenModal()} icon={Plus} className="w-full sm:w-auto">
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:hidden gap-4">
        {/* Mobile View: Cards */}
        {filteredProducts.map(product => {
           const profit = product.sellingPrice - product.costPrice;
           const isLowStock = product.quantity <= product.minStock;
           return (
             <Card key={product.id} className={`p-4 ${isLowStock ? 'border-red-200 bg-red-50' : ''}`}>
               <div className="flex justify-between items-start mb-2">
                 <div>
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <Badge>{product.category}</Badge>
                 </div>
                 <div className="text-right">
                    <span className={`text-lg font-bold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>{product.quantity}</span>
                    <div className="text-xs text-gray-500">In Stock</div>
                 </div>
               </div>
               
               <div className="flex justify-between items-center text-sm text-gray-600 border-t border-b py-2 my-2 border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400">Buy</span>
                    <span>₹{product.costPrice}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-gray-400">Sell</span>
                    <span>₹{product.sellingPrice}</span>
                  </div>
                  <div className="flex flex-col text-right text-green-600 font-medium">
                    <span className="text-xs text-gray-400">Profit</span>
                    <span>+₹{profit.toFixed(2)}</span>
                  </div>
               </div>

               <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => handleOpenModal(product)} icon={Edit2}>Edit</Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => onDeleteProduct(product.id)} icon={Trash2}>Delete</Button>
               </div>
             </Card>
           );
        })}
        {filteredProducts.length === 0 && (
          <div className="text-center py-10 text-gray-500">No products found.</div>
        )}
      </div>

      {/* Desktop View: Table */}
      <Card className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prices (C/S)</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Profit/Unit</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => {
              const profit = product.sellingPrice - product.costPrice;
              const isLowStock = product.quantity <= product.minStock;

              return (
                <tr key={product.id} className={isLowStock ? "bg-red-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Badge>{product.category}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                    ₹{product.costPrice} / ₹{product.sellingPrice}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-medium text-green-600">+₹{profit.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <span className={`text-sm font-bold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                        {product.quantity}
                      </span>
                      {isLowStock && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleOpenModal(product)} className="text-brand-600 hover:text-brand-900 mr-4">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDeleteProduct(product.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Edit Product" : "New Product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Product Name" 
            required 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
          />
          <Input 
            label="Category" 
            required 
            value={formData.category} 
            onChange={e => setFormData({...formData, category: e.target.value})} 
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Cost Price (₹)" 
              type="number" 
              step="0.01" 
              required 
              value={formData.costPrice} 
              onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value)})} 
            />
            <Input 
              label="Selling Price (₹)" 
              type="number" 
              step="0.01" 
              required 
              value={formData.sellingPrice} 
              onChange={e => setFormData({...formData, sellingPrice: parseFloat(e.target.value)})} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Current Quantity" 
              type="number" 
              required 
              value={formData.quantity} 
              onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} 
            />
            <Input 
              label="Low Stock Alert" 
              type="number" 
              required 
              value={formData.minStock} 
              onChange={e => setFormData({...formData, minStock: parseInt(e.target.value)})} 
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingProduct ? 'Update' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};