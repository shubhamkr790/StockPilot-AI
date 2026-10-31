import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Archive, 
  SlidersHorizontal, 
  AlertTriangle, 
  Check, 
  X, 
  Package, 
  Lock 
} from 'lucide-react';
import { ProductStockSummary, UserProfile } from '../types';
import { api, formatPaise, parseRupeesToPaise } from '../services/api';

interface ProductCatalogProps {
  currentUser: UserProfile | null;
  onRefreshMetrics: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  currentUser,
  onRefreshMetrics,
}) => {
  const [products, setProducts] = useState<ProductStockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeProduct, setActiveProduct] = useState<ProductStockSummary | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'General',
    unit: 'pcs' as any,
    costPriceRupees: '',
    sellingPriceRupees: '',
    reorderLevel: '15',
    leadTimeDays: '3',
    packSize: '1',
    initialQuantity: '0',
  });

  const [adjustData, setAdjustData] = useState({
    deltaQuantity: '',
    reason: 'damaged',
    notes: '',
  });

  const [notification, setNotification] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOwner = currentUser?.role === 'OWNER';

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.getProducts({
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        q: searchQuery || undefined,
      });
      setProducts(res.products);
    } catch (err: any) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, searchQuery]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.createProduct({
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        unit: formData.unit,
        costPricePaise: parseRupeesToPaise(formData.costPriceRupees),
        sellingPricePaise: parseRupeesToPaise(formData.sellingPriceRupees),
        reorderLevel: parseFloat(formData.reorderLevel),
        leadTimeDays: parseInt(formData.leadTimeDays),
        packSize: parseInt(formData.packSize),
        initialQuantity: parseFloat(formData.initialQuantity),
      });

      setShowAddModal(false);
      setNotification(`Product '${formData.name}' added successfully.`);
      fetchProducts();
      onRefreshMetrics();
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) return;
    setErrorMsg(null);
    try {
      const fullReason = adjustData.notes 
        ? `${adjustData.reason} - ${adjustData.notes}` 
        : adjustData.reason;

      await api.manualStockAdjustment(
        activeProduct.id,
        parseFloat(adjustData.deltaQuantity),
        fullReason
      );

      setShowAdjustModal(false);
      setNotification(`Stock adjusted for '${activeProduct.name}'. Movement logged to audit ledger.`);
      fetchProducts();
      onRefreshMetrics();
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) return;
    setErrorMsg(null);
    try {
      await api.updateProduct(activeProduct.id, {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        costPricePaise: parseRupeesToPaise(formData.costPriceRupees),
        sellingPricePaise: parseRupeesToPaise(formData.sellingPriceRupees),
        reorderLevel: parseFloat(formData.reorderLevel),
        leadTimeDays: parseInt(formData.leadTimeDays),
        packSize: parseInt(formData.packSize),
      });

      setShowEditModal(false);
      setNotification(`Product '${formData.name}' updated.`);
      fetchProducts();
      onRefreshMetrics();
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleArchive = async (prod: ProductStockSummary) => {
    if (!confirm(`Are you sure you want to archive '${prod.name}'? Past sales and ledger movements will stay intact.`)) {
      return;
    }
    try {
      await api.archiveProduct(prod.id);
      setNotification(`Product '${prod.name}' archived.`);
      fetchProducts();
      onRefreshMetrics();
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(`Archive failed: ${err.message}`);
    }
  };

  // Filter products by status
  const filteredProducts = products.filter((p) => {
    if (selectedStatus === 'ALL') return true;
    return p.status === selectedStatus;
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));

  return (
    <div className="space-y-6">
      {/* Catalog Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D8DDD8] gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111814]">
            Product Catalog & Stock Ledger
          </h1>
          <p className="text-xs text-[#637069] mt-1 font-mono">
            {isOwner ? '👑 Owner Mode: Full edit, pricing, and stock adjustment authority.' : '⚡ Staff Mode: Read-only catalog. Stock updates occur via POS or approved Invoices.'}
          </p>
        </div>

        {isOwner ? (
          <button
            onClick={() => {
              setFormData({
                name: '',
                sku: '',
                category: 'General',
                unit: 'pcs',
                costPriceRupees: '',
                sellingPriceRupees: '',
                reorderLevel: '15',
                leadTimeDays: '3',
                packSize: '1',
                initialQuantity: '0',
              });
              setShowAddModal(true);
            }}
            className="btn-sharp bg-[#0F392B] hover:bg-[#0A251C] text-white border border-[#0A251C] text-xs font-mono py-1.5 px-3 flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD PRODUCT</span>
          </button>
        ) : (
          <div className="flex items-center space-x-1.5 text-xs text-[#637069] font-mono bg-[#F0F2F0] px-3 py-1.5 border border-[#D8DDD8]">
            <Lock className="w-3.5 h-3.5 text-[#0F392B]" />
            <span>Staff Cannot Alter Products</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {notification && (
        <div className="bg-[#0F392B] text-emerald-200 border border-[#047857] p-3 text-xs font-mono flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="card-sharp bg-white border border-[#D8DDD8] p-3 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#637069] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F9FAF9] border border-[#D8DDD8] pl-9 pr-3 py-1.5 text-xs text-[#111814] font-mono focus:outline-none focus:border-[#0F392B]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#F9FAF9] border border-[#D8DDD8] px-2.5 py-1.5 text-xs text-[#111814] font-mono focus:outline-none focus:border-[#0F392B]"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1 border border-[#D8DDD8] p-0.5 bg-[#F9FAF9]">
            {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider font-semibold ${
                  selectedStatus === st
                    ? 'bg-[#0F392B] text-white'
                    : 'text-[#637069] hover:text-[#111814]'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="card-sharp bg-white border border-[#D8DDD8] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#0F392B] text-white font-mono text-[11px] uppercase tracking-wider border-b border-[#0A251C]">
              <th className="p-3">SKU</th>
              <th className="p-3">Product Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Unit</th>
              <th className="p-3 text-right">Cost (Paise)</th>
              <th className="p-3 text-right">Price (Paise)</th>
              <th className="p-3 text-right">Current Stock</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Lead Time</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8DDD8]">
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-[#637069] font-mono">
                  Loading catalog inventory...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-[#637069] font-mono">
                  No products found matching the criteria.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                let statusBadge = (
                  <span className="tag-sharp bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]">
                    In Stock
                  </span>
                );
                if (p.status === 'OUT_OF_STOCK') {
                  statusBadge = (
                    <span className="tag-sharp bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]">
                      Stock-Out
                    </span>
                  );
                } else if (p.status === 'LOW_STOCK') {
                  statusBadge = (
                    <span className="tag-sharp bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]">
                      Low Stock
                    </span>
                  );
                }

                return (
                  <tr key={p.id} className="hover:bg-[#F9FAF9] transition-colors">
                    <td className="p-3 font-mono font-semibold text-[#0F392B]">
                      {p.sku}
                    </td>
                    <td className="p-3 font-medium text-[#111814]">
                      {p.name}
                    </td>
                    <td className="p-3 text-[#637069]">
                      {p.category}
                    </td>
                    <td className="p-3 font-mono text-[#637069]">
                      {p.unit}
                    </td>
                    <td className="p-3 text-right font-mono text-[#637069]">
                      {formatPaise(p.costPricePaise)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-[#111814]">
                      {formatPaise(p.sellingPricePaise)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-[#111814]">
                      {p.currentStock} {p.unit}
                    </td>
                    <td className="p-3 text-center">
                      {statusBadge}
                    </td>
                    <td className="p-3 text-center font-mono text-[#637069]">
                      {p.leadTimeDays}d
                    </td>
                    <td className="p-3 text-right">
                      {isOwner ? (
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setActiveProduct(p);
                              setAdjustData({ deltaQuantity: '', reason: 'damaged', notes: '' });
                              setShowAdjustModal(true);
                            }}
                            className="btn-sharp bg-[#F0F2F0] hover:bg-[#0F392B] hover:text-white text-[#111814] border border-[#D8DDD8] text-[10px] font-mono py-1 px-2"
                            title="Manual stock adjustment (damaged, expired, etc.)"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() => {
                              setActiveProduct(p);
                              setFormData({
                                name: p.name,
                                sku: p.sku,
                                category: p.category,
                                unit: p.unit,
                                costPriceRupees: (p.costPricePaise / 100).toString(),
                                sellingPriceRupees: (p.sellingPricePaise / 100).toString(),
                                reorderLevel: p.reorderLevel.toString(),
                                leadTimeDays: p.leadTimeDays.toString(),
                                packSize: p.packSize.toString(),
                                initialQuantity: '0',
                              });
                              setShowEditModal(true);
                            }}
                            className="btn-sharp bg-white hover:bg-neutral-100 text-[#111814] border border-[#D8DDD8] text-[10px] font-mono py-1 px-1.5"
                            title="Edit product"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleArchive(p)}
                            className="btn-sharp bg-white hover:bg-red-50 text-[#DC2626] border border-[#FECACA] text-[10px] font-mono py-1 px-1.5"
                            title="Archive product"
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#637069] font-mono">View Only</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: ADD PRODUCT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card-sharp bg-white border border-[#D8DDD8] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8DDD8] pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#0F392B]">
                Add New Product (Master SKU)
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#637069] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-2.5 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#637069] mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                    placeholder="e.g. Cooking Oil 1L"
                  />
                </div>
                <div>
                  <label className="block text-[#637069] mb-1">SKU (Unique) *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                    placeholder="e.g. KIR-OIL-1L"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#637069] mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#637069] mb-1">Unit of Measure *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                  >
                    <option value="pcs">Pieces (pcs - integer)</option>
                    <option value="box">Box (box - integer)</option>
                    <option value="kg">Kilogram (kg - decimal)</option>
                    <option value="litre">Litre (litre - decimal)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#637069] mb-1">Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.costPriceRupees}
                    onChange={(e) => setFormData({ ...formData, costPriceRupees: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                    placeholder="110.00"
                  />
                </div>
                <div>
                  <label className="block text-[#637069] mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sellingPriceRupees}
                    onChange={(e) => setFormData({ ...formData, sellingPriceRupees: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                    placeholder="135.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#637069] mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#637069] mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#637069] mb-1">Carton Pack Size</label>
                  <input
                    type="number"
                    value={formData.packSize}
                    onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#637069] mb-1">Initial Opening Stock Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={formData.initialQuantity}
                  onChange={(e) => setFormData({ ...formData, initialQuantity: e.target.value })}
                  className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#D8DDD8]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-sharp bg-white hover:bg-neutral-100 text-[#111814] border border-[#D8DDD8] px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-sharp bg-[#0F392B] hover:bg-[#0A251C] text-white border border-[#0A251C] px-4 py-1.5 font-bold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL STOCK ADJUSTMENT (Owner Only with Mandatory Reason) */}
      {showAdjustModal && activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card-sharp bg-white border border-[#D8DDD8] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8DDD8] pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#0F392B]">
                Manual Stock Adjustment (§02)
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-[#637069] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F9FAF9] p-3 border border-[#D8DDD8] text-xs font-mono space-y-1">
              <div><strong>Product:</strong> {activeProduct.name}</div>
              <div><strong>Current Available Stock:</strong> {activeProduct.currentStock} {activeProduct.unit}</div>
              <div className="text-[10px] text-[#637069]">
                Rule: Quantity changes only through an immutable ledger movement. A reason is mandatory.
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-2.5 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[#637069] mb-1">
                  Delta Quantity (use + for increase, - for reduction) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. -2 or 5"
                  value={adjustData.deltaQuantity}
                  onChange={(e) => setAdjustData({ ...adjustData, deltaQuantity: e.target.value })}
                  className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#637069] mb-1">Mandatory Reason *</label>
                <select
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                >
                  <option value="damaged">Damaged Goods</option>
                  <option value="expired">Expired Products</option>
                  <option value="counting error">Counting Error / Stocktake Reconciliation</option>
                  <option value="theft_shrinkage">Shrinkage / Unaccounted Loss</option>
                </select>
              </div>

              <div>
                <label className="block text-[#637069] mb-1">Audit Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Details for audit log..."
                  value={adjustData.notes}
                  onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                  className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#D8DDD8]">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="btn-sharp bg-white hover:bg-neutral-100 text-[#111814] border border-[#D8DDD8] px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-sharp bg-[#0F392B] hover:bg-[#0A251C] text-white border border-[#0A251C] px-4 py-1.5 font-bold"
                >
                  Post Ledger Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PRODUCT */}
      {showEditModal && activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card-sharp bg-white border border-[#D8DDD8] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8DDD8] pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#0F392B]">
                Edit Product Configuration
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-[#637069] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-2.5 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#637069] mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#637069] mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#637069] mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.costPriceRupees}
                    onChange={(e) => setFormData({ ...formData, costPriceRupees: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#637069] mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sellingPriceRupees}
                    onChange={(e) => setFormData({ ...formData, sellingPriceRupees: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#637069] mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#637069] mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#637069] mb-1">Pack Size</label>
                  <input
                    type="number"
                    value={formData.packSize}
                    onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                    className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-3 py-1.5 focus:border-[#0F392B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#D8DDD8]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-sharp bg-white hover:bg-neutral-100 text-[#111814] border border-[#D8DDD8] px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-sharp bg-[#0F392B] hover:bg-[#0A251C] text-white border border-[#0A251C] px-4 py-1.5 font-bold"
                >
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
