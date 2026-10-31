import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Check, 
  X, 
  Search, 
  Receipt, 
  AlertTriangle, 
  Zap, 
  Printer 
} from 'lucide-react';
import { ProductStockSummary, SaleTransaction, UserProfile } from '../types';
import { api, formatPaise } from '../services/api';

interface StaffPOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSaleComplete: () => void;
}

interface CartItem {
  product: ProductStockSummary;
  quantity: number;
}

export const StaffPOSModal: React.FC<StaffPOSModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaleComplete,
}) => {
  const [products, setProducts] = useState<ProductStockSummary[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [completingSale, setCompletingSale] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCatalog();
      setCart([]);
      setCompletedSale(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const res = await api.getProducts();
      setProducts(res.products);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const addToCart = (product: ProductStockSummary) => {
    setErrorMessage(null);
    const existing = cart.find((i) => i.product.id === product.id);

    if (existing) {
      // Check stock bound
      if (existing.quantity + 1 > product.currentStock) {
        setErrorMessage(`Cannot add more. Only ${product.currentStock} ${product.unit} available in stock.`);
        return;
      }
      setCart(cart.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      if (product.currentStock < 1) {
        setErrorMessage(`Product '${product.name}' is out of stock!`);
        return;
      }
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, newQty: number) => {
    setErrorMessage(null);
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    if (newQty <= 0) {
      setCart(cart.filter((i) => i.product.id !== productId));
      return;
    }

    if (newQty > item.product.currentStock) {
      setErrorMessage(`Cannot set ${newQty}. Only ${item.product.currentStock} ${item.product.unit} available in stock.`);
      return;
    }

    setCart(cart.map((i) => i.product.id === productId ? { ...i, quantity: newQty } : i));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.product.id !== productId));
  };

  const totalPaise = cart.reduce(
    (acc, curr) => acc + Math.round(curr.quantity * curr.product.sellingPricePaise),
    0
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setErrorMessage(null);
    setCompletingSale(true);

    try {
      const items = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));

      // Generate client idempotency key to prevent double charging on retry
      const idempotencyKey = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const res = await api.recordSale(items, idempotencyKey);
      setCompletedSale(res.sale);
      setCart([]);
      onSaleComplete();
      await loadCatalog();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setCompletingSale(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 select-none">
      <div 
        className="card-sharp bg-white border border-[#0F392B] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl"
        style={{ borderRadius: '0px' }}
      >
        {/* Header */}
        <div className="bg-[#0F392B] text-white p-3.5 flex items-center justify-between border-b border-[#0A251C]">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider">
              High-Speed Staff POS Checkout (&lt;15s)
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-emerald-300">
              Staff: {currentUser?.name}
            </span>
            <button 
              onClick={onClose}
              className="text-white hover:text-emerald-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Column: Product Selection Grid */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[#D8DDD8] p-3 overflow-hidden">
            
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-[#637069] absolute left-3 top-2.5" />
              <input
                type="text"
                autoFocus
                placeholder="Type item name or SKU (e.g. Oil, Biscuits, Rice)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F9FAF9] border border-[#D8DDD8] pl-9 pr-3 py-1.5 text-xs text-[#111814] font-mono focus:border-[#0F392B] focus:outline-none"
              />
            </div>

            {/* Quick Product Chips */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loading ? (
                <div className="p-8 text-center text-xs font-mono text-[#637069]">Loading items...</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredProducts.map((p) => {
                    const isOut = p.currentStock <= 0;
                    return (
                      <button
                        key={p.id}
                        disabled={isOut}
                        onClick={() => addToCart(p)}
                        className={`text-left p-2.5 border transition-all text-xs font-mono flex flex-col justify-between ${
                          isOut
                            ? 'bg-[#F9FAF9] border-[#E5E7EB] opacity-50 cursor-not-allowed'
                            : 'bg-white hover:border-[#0F392B] hover:bg-[#F0F4F2] border-[#D8DDD8]'
                        }`}
                      >
                        <div>
                          <div className="text-[10px] text-[#0F392B] font-bold">{p.sku}</div>
                          <div className="font-semibold text-[#111814] truncate mt-0.5">{p.name}</div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#F0F2F0]">
                          <span className="font-bold text-sm text-[#0F392B]">
                            {formatPaise(p.sellingPricePaise)}
                          </span>
                          <span className={`text-[10px] ${p.currentStock <= p.reorderLevel ? 'text-amber-700 font-bold' : 'text-[#637069]'}`}>
                            Stock: {p.currentStock} {p.unit}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Cart & Instant Checkout */}
          <div className="w-full md:w-80 flex flex-col bg-[#F9FAF9] p-3 justify-between">
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-[#D8DDD8] mb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#111814]">
                  Current Bill ({cart.length} items)
                </span>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[10px] font-mono text-[#DC2626] hover:underline"
                  >
                    Clear Bill
                  </button>
                )}
              </div>

              {/* Error Alert (e.g. Concurrency race condition or stock out) */}
              {errorMessage && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] p-2 text-xs font-mono mb-2 flex items-start space-x-1.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#DC2626]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#637069]">
                    <ShoppingCart className="w-8 h-8 text-[#D8DDD8] mb-2" />
                    <p className="text-xs font-mono">No items added to bill.</p>
                    <p className="text-[10px] text-[#637069] mt-1 font-mono">
                      Click any item on the left to add instantly.
                    </p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const lineTotal = Math.round(item.quantity * item.product.sellingPricePaise);
                    return (
                      <div
                        key={item.product.id}
                        className="bg-white border border-[#D8DDD8] p-2 text-xs font-mono flex items-center justify-between"
                      >
                        <div className="flex-1 pr-2">
                          <div className="font-bold text-[#111814] truncate">{item.product.name}</div>
                          <div className="text-[10px] text-[#637069]">
                            {formatPaise(item.product.sellingPricePaise)} / {item.product.unit}
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-5 h-5 bg-[#F0F2F0] hover:bg-[#D8DDD8] flex items-center justify-center border border-[#D8DDD8]"
                          >
                            <Minus className="w-3 h-3 text-[#111814]" />
                          </button>
                          <span className="w-8 text-center font-bold font-mono text-xs">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-5 h-5 bg-[#F0F2F0] hover:bg-[#D8DDD8] flex items-center justify-center border border-[#D8DDD8]"
                          >
                            <Plus className="w-3 h-3 text-[#111814]" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="w-16 text-right font-bold text-[#0F392B] pl-2">
                          {formatPaise(lineTotal)}
                        </div>

                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-[#637069] hover:text-[#DC2626] ml-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bill Summary & Pay Button */}
            <div className="border-t border-[#D8DDD8] pt-3 mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#637069]">Subtotal (Paise exact):</span>
                <span className="font-semibold">{formatPaise(totalPaise)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-mono font-bold text-[#111814]">
                <span>Total Amount:</span>
                <span className="text-xl text-[#0F392B]">{formatPaise(totalPaise)}</span>
              </div>

              <button
                disabled={cart.length === 0 || completingSale}
                onClick={handleCheckout}
                className="w-full btn-sharp bg-[#047857] hover:bg-[#059669] text-white border border-[#065F46] py-3 text-sm font-mono font-bold tracking-wider disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Receipt className="w-4 h-4" />
                <span>
                  {completingSale ? 'COMMITTING SALE...' : `COMPLETE SALE (${formatPaise(totalPaise)})`}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* RECEIPT MODAL OVERLAY UPON SALE SUCCESS */}
        {completedSale && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col p-6 items-center justify-center space-y-4">
            <div className="w-12 h-12 bg-[#047857] text-white flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold font-mono text-[#0F392B]">
                SALE COMPLETED ATOMICALLY
              </h3>
              <p className="text-xs text-[#637069] font-mono">
                Receipt #{completedSale.receiptNumber} | Movement logged to double-entry ledger
              </p>
            </div>

            {/* Printable Receipt Box */}
            <div className="w-full max-w-sm bg-[#F9FAF9] border border-[#D8DDD8] p-4 text-xs font-mono space-y-2">
              <div className="text-center pb-2 border-b border-[#D8DDD8]">
                <div className="font-bold text-sm">STOCKPILOT AI RETAIL</div>
                <div className="text-[10px] text-[#637069]">{completedSale.timestamp}</div>
              </div>

              <div className="space-y-1 divide-y divide-[#F0F2F0]">
                {completedSale.items.map((it) => (
                  <div key={it.productId} className="flex justify-between pt-1">
                    <span>{it.quantity}x {it.productName}</span>
                    <span className="font-bold">{formatPaise(it.lineTotalPaise)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#D8DDD8] pt-2 flex justify-between font-bold text-sm text-[#0F392B]">
                <span>TOTAL PAID:</span>
                <span>{formatPaise(completedSale.totalAmountPaise)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.print()}
                className="btn-sharp bg-white hover:bg-neutral-100 text-[#111814] border border-[#D8DDD8] text-xs font-mono py-1.5 px-3 flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PRINT RECEIPT</span>
              </button>
              <button
                onClick={() => {
                  setCompletedSale(null);
                  onClose();
                }}
                className="btn-sharp bg-[#0F392B] hover:bg-[#0A251C] text-white border border-[#0A251C] text-xs font-mono py-1.5 px-4 font-bold"
              >
                DONE (NEXT CUSTOMER)
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
