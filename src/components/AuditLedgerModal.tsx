import React, { useState, useEffect } from 'react';
import { Layers, X, Download, ShieldCheck, ArrowUpRight, ArrowDownLeft, RotateCw } from 'lucide-react';
import { InventoryMovement } from '../types';
import { api } from '../services/api';

interface AuditLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLedgerModal: React.FC<AuditLedgerModalProps> = ({ isOpen, onClose }) => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadLedger();
    }
  }, [isOpen]);

  const loadLedger = async () => {
    try {
      setLoading(true);
      const res = await api.getLedgerMovements(100);
      setMovements(res.movements);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 select-none">
      <div 
        className="card-sharp bg-white border border-[#0F392B] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl"
        style={{ borderRadius: '0px' }}
      >
        {/* Header */}
        <div className="bg-[#0F392B] text-white p-3.5 flex items-center justify-between border-b border-[#0A251C]">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider">
              Immutable Double-Entry Movement Ledger (§02)
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadLedger}
              className="text-emerald-300 hover:text-white flex items-center space-x-1 text-xs font-mono"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button onClick={onClose} className="text-white hover:text-emerald-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader */}
        <div className="bg-[#F9FAF9] p-3 border-b border-[#D8DDD8] text-xs font-mono flex items-center justify-between">
          <div className="text-[#637069]">
            Stock is an event-sourced ledger, not a mutable number. Every quantity change records <strong>who, when, quantity, and reason</strong>.
          </div>
          <span className="font-bold text-[#111814]">{movements.length} logged entries</span>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="card-sharp bg-white border border-[#D8DDD8] overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#0F392B] text-white text-[11px] uppercase border-b border-[#0A251C]">
                  <th className="p-2.5">Timestamp</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Product ID</th>
                  <th className="p-2.5 text-right">Quantity</th>
                  <th className="p-2.5">Recorded Reason</th>
                  <th className="p-2.5">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8DDD8]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#637069]">
                      Loading ledger transactions...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#637069]">
                      No movement history recorded.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isPositive = m.quantity > 0;
                    let typeBadge = (
                      <span className="tag-sharp bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]">
                        PURCHASE
                      </span>
                    );
                    if (m.movementType === 'SALE') {
                      typeBadge = (
                        <span className="tag-sharp bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]">
                          SALE
                        </span>
                      );
                    } else if (m.movementType === 'ADJUSTMENT') {
                      typeBadge = (
                        <span className="tag-sharp bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]">
                          ADJUSTMENT
                        </span>
                      );
                    }

                    return (
                      <tr key={m.id} className="hover:bg-[#F9FAF9]">
                        <td className="p-2.5 text-[#637069] text-[11px] whitespace-nowrap">
                          {new Date(m.timestamp).toLocaleString()}
                        </td>
                        <td className="p-2.5">
                          {typeBadge}
                        </td>
                        <td className="p-2.5 font-bold text-[#0F392B]">
                          {m.productId}
                        </td>
                        <td className={`p-2.5 text-right font-black ${isPositive ? 'text-[#047857]' : 'text-[#DC2626]'}`}>
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td className="p-2.5 text-[#111814] max-w-xs truncate" title={m.reason}>
                          {m.reason}
                        </td>
                        <td className="p-2.5 text-[#637069]">
                          {m.createdByName}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
