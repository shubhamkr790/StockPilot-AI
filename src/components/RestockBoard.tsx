import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Download, 
  Printer, 
  RotateCcw, 
  Calendar, 
  Clock, 
  Package, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { api, formatPaise } from '../services/api';

export const RestockBoard: React.FC = () => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await api.getRestockRecommendations();
      setRecommendations(res.recommendations);
    } catch (err: any) {
      console.error('Failed to load restock recommendations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleResetSeed = async () => {
    try {
      setResetting(true);
      const res = await api.resetSeedData();
      setNotification(res.message);
      await fetchRecommendations();
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D8DDD8] gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-[#111814]">
              Predictive Restock & Replenishment
            </h1>
            <span className="tag-sharp bg-[#0F392B] text-emerald-200 border-[#0A251C]">
              EXPLAINABLE AI
            </span>
          </div>
          <p className="text-xs text-[#637069] mt-1 font-mono">
            Every suggested order is derived mathematically from real sales history. Zero black-box guessing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seed 30-Day Kirana Data Button for Judges */}
          <button
            onClick={handleResetSeed}
            disabled={resetting}
            className="btn-sharp bg-[#111814] hover:bg-black text-[#34D399] border border-[#047857] text-xs font-mono py-1.5 px-3 flex items-center space-x-1.5"
            title="Reset to 30-day realistic sales history for demo (Cooking Oil 6/day, etc.)"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>SEED 30-DAY SALES DATA</span>
          </button>

          {/* Export CSV */}
          <a
            href="/api/forecast/export-csv"
            download
            className="btn-sharp bg-white hover:bg-neutral-100 text-[#0F392B] border border-[#0F392B] text-xs font-mono py-1.5 px-3 flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </a>

          {/* Printable Purchase Order */}
          <button
            onClick={handlePrint}
            className="btn-sharp bg-[#0F392B] hover:bg-[#0A251C] text-white border border-[#0A251C] text-xs font-mono py-1.5 px-3 flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PRINT PO</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="bg-[#0F392B] text-emerald-200 border border-[#047857] p-3 text-xs font-mono flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Formula & Explainability Callout Banner */}
      <div className="card-sharp bg-white border border-[#D8DDD8] p-4 text-xs">
        <div className="font-mono font-bold uppercase tracking-wider text-[#0F392B] mb-2 flex items-center space-x-1.5">
          <HelpCircle className="w-4 h-4" />
          <span>Restock Formula Contract (§04 Verification)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[#111814] font-mono text-[11px] bg-[#F9FAF9] p-3 border border-[#D8DDD8]">
          <div>
            <span className="font-bold text-[#0F392B]">1. Sales Velocity (V):</span>
            <div className="text-[#637069]">Units sold ÷ 14-day rolling window</div>
          </div>
          <div>
            <span className="font-bold text-[#0F392B]">2. Days of Cover:</span>
            <div className="text-[#637069]">Current Stock ÷ Velocity</div>
          </div>
          <div>
            <span className="font-bold text-[#0F392B]">3. Stock-Out Prediction:</span>
            <div className="text-[#637069]">Today + Days of Cover</div>
          </div>
          <div>
            <span className="font-bold text-[#0F392B]">4. Target Order Qty (Q):</span>
            <div className="text-[#637069]">Ceil((V × (Lead + Safety) - Stock) / Pack) × Pack</div>
          </div>
        </div>
      </div>

      {/* Recommendations Table */}
      {loading ? (
        <div className="card-sharp bg-white border border-[#D8DDD8] p-8 text-center text-[#637069] font-mono text-xs">
          Calculating replenishment requirements across historical ledger movements...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="card-sharp bg-white border border-[#D8DDD8] p-12 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-[#047857] mx-auto" />
          <h3 className="text-sm font-bold text-[#111814]">Inventory Fully Healthy</h3>
          <p className="text-xs text-[#637069] max-w-md mx-auto">
            All catalog products currently hold adequate safety stock covering supplier lead times. Zero immediate replenishment orders required.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-mono text-[#637069]">
            Showing <span className="font-bold text-[#111814]">{recommendations.length}</span> product{recommendations.length > 1 ? 's' : ''} triggering restock:
          </div>

          <div className="grid grid-cols-1 gap-4">
            {recommendations.map((item) => (
              <div 
                key={item.productId}
                className="card-sharp bg-white border border-[#D8DDD8] p-4 hover:border-[#0F392B] transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Product Info & Core Metrics */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold bg-[#F0F2F0] text-[#0F392B] px-1.5 py-0.5 border border-[#D8DDD8]">
                        {item.sku}
                      </span>
                      <h3 className="text-sm font-bold text-[#111814]">
                        {item.name}
                      </h3>
                      {!item.hasEnoughHistory && (
                        <span className="tag-sharp bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]">
                          Cold Start (&lt;7 Days)
                        </span>
                      )}
                    </div>

                    {/* Metric Badges */}
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#637069] pt-1">
                      <div className="flex items-center space-x-1">
                        <Package className="w-3.5 h-3.5 text-[#0F392B]" />
                        <span>Current Stock: </span>
                        <strong className="text-[#111814]">{item.currentStock} {item.unit}</strong>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-[#0F392B]" />
                        <span>Lead Time: </span>
                        <strong className="text-[#111814]">{item.leadTimeDays} days</strong>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Daily Velocity: </span>
                        <strong className="text-[#111814]">{item.salesVelocity} {item.unit}/day</strong>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Days of Cover: </span>
                        <strong className={item.daysOfCover <= item.leadTimeDays ? 'text-[#DC2626]' : 'text-[#D97706]'}>
                          {item.daysOfCover === 999 ? '∞' : `${item.daysOfCover} days`}
                        </strong>
                      </div>
                      {item.predictedStockOutDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-[#DC2626]" />
                          <span>Predicted Stock-Out: </span>
                          <strong className="text-[#DC2626]">{item.predictedStockOutDate}</strong>
                        </div>
                      )}
                    </div>

                    {/* Human-Readable Explanation Box (§04) */}
                    <div className="bg-[#F4F6F5] border border-[#D8DDD8] p-2.5 text-xs text-[#111814] font-mono mt-2">
                      <div className="text-[10px] uppercase font-bold text-[#0F392B] mb-0.5">
                        Recommendation Breakdown:
                      </div>
                      <div className="font-semibold text-emerald-900">
                        {item.explanation}
                      </div>
                    </div>
                  </div>

                  {/* Right: Suggested Order Quantity Card */}
                  <div className="bg-[#0F392B] text-white p-4 min-w-[200px] flex flex-col justify-between border border-[#0A251C]">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-mono text-emerald-300 font-bold">
                        Suggested Order
                      </div>
                      <div className="text-3xl font-black font-mono text-white mt-1">
                        {item.recommendedQuantity} <span className="text-xs font-normal text-emerald-200">{item.unit}</span>
                      </div>
                      {item.packSize > 1 && (
                        <div className="text-[10px] font-mono text-emerald-200 mt-0.5">
                          Pack size: {item.packSize} per carton ({Math.ceil(item.recommendedQuantity / item.packSize)} cartons)
                        </div>
                      )}
                    </div>
                    <div className="border-t border-[#0A251C] pt-2 mt-3 text-xs font-mono flex items-center justify-between text-emerald-200">
                      <span>Est. Cost:</span>
                      <strong className="text-white text-sm">{formatPaise(item.estimatedCostPaise)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
