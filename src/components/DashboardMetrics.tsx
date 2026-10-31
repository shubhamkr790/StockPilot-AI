import React from 'react';
import { Package, AlertTriangle, AlertOctagon, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';
import { DashboardMetrics as MetricsType } from '../types';
import { formatPaise } from '../services/api';

interface DashboardMetricsProps {
  metrics: MetricsType | null;
  onNavigateToRestock: () => void;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
  metrics,
  onNavigateToRestock,
}) => {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-white border border-[#D8DDD8]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Critical Reorder Notification Banner if items need restocking */}
      {metrics.reorderNeededCount > 0 && (
        <div className="bg-[#0F392B] border border-[#0A251C] text-white p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#047857] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider font-mono text-emerald-300">
                Action Required: Replenishment Alert
              </div>
              <div className="text-sm font-semibold">
                {metrics.reorderNeededCount} product{metrics.reorderNeededCount > 1 ? 's' : ''} have fallen below reorder level or cover threshold.
              </div>
            </div>
          </div>
          <button
            onClick={onNavigateToRestock}
            className="btn-sharp bg-white hover:bg-emerald-50 text-[#0F392B] border border-white text-xs font-mono font-bold py-1.5 px-3 self-start sm:self-auto"
          >
            REVIEW RESTOCK LIST →
          </button>
        </div>
      )}

      {/* 5-Column High-Density Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: Total Products */}
        <div className="card-sharp p-3.5 bg-white border border-[#D8DDD8]">
          <div className="flex items-center justify-between text-[#637069] mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold">Catalog Items</span>
            <Package className="w-4 h-4 text-[#0F392B]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#111814]">
            {metrics.totalProducts}
          </div>
          <div className="text-[10px] text-[#637069] mt-1 font-mono">
            Active Store SKUs
          </div>
        </div>

        {/* Metric 2: Low Stock Count */}
        <div className="card-sharp p-3.5 bg-white border border-[#D8DDD8]">
          <div className="flex items-center justify-between text-[#B45309] mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#D97706]">
            {metrics.lowStockCount}
          </div>
          <div className="text-[10px] text-[#637069] mt-1 font-mono">
            Stock ≤ Reorder Level
          </div>
        </div>

        {/* Metric 3: Out of Stock */}
        <div className="card-sharp p-3.5 bg-white border border-[#D8DDD8]">
          <div className="flex items-center justify-between text-[#991B1B] mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold">Stock-Out</span>
            <AlertOctagon className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#DC2626]">
            {metrics.outOfStockCount}
          </div>
          <div className="text-[10px] text-[#637069] mt-1 font-mono">
            Zero Units Available
          </div>
        </div>

        {/* Metric 4: Today's POS Sales */}
        <div className="card-sharp p-3.5 bg-white border border-[#D8DDD8]">
          <div className="flex items-center justify-between text-[#0F392B] mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold">Today's Sales</span>
            <TrendingUp className="w-4 h-4 text-[#047857]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#0F392B]">
            {formatPaise(metrics.todaySalesPaise)}
          </div>
          <div className="text-[10px] text-[#637069] mt-1 font-mono">
            {metrics.todayOrdersCount} POS receipt{metrics.todayOrdersCount !== 1 ? 's' : ''} today
          </div>
        </div>

        {/* Metric 5: Total Inventory Valuation */}
        <div className="card-sharp p-3.5 bg-white border border-[#D8DDD8] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#637069] mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold">Total Stock Value</span>
            <DollarSign className="w-4 h-4 text-[#0F392B]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#111814]">
            {formatPaise(metrics.totalStockValuePaise)}
          </div>
          <div className="text-[10px] text-[#637069] mt-1 font-mono">
            At Wholesaler Cost Price
          </div>
        </div>
      </div>
    </div>
  );
};
