import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Check, 
  X, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit3, 
  HelpCircle, 
  CheckCircle2, 
  ShieldAlert, 
  FileCheck 
} from 'lucide-react';
import { Invoice, InvoiceLineItem, ProductStockSummary, UserProfile } from '../types';
import { api, formatPaise, parseRupeesToPaise } from '../services/api';

interface OCRInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onInvoiceConfirmed: () => void;
}

export const OCRInvoiceModal: React.FC<OCRInvoiceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onInvoiceConfirmed,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [draftInvoice, setDraftInvoice] = useState<Invoice | null>(null);
  const [validation, setValidation] = useState<any>(null);
  const [catalog, setCatalog] = useState<ProductStockSummary[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwner = currentUser?.role === 'OWNER';

  useEffect(() => {
    if (isOpen) {
      loadCatalog();
      setFile(null);
      setDraftInvoice(null);
      setValidation(null);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const loadCatalog = async () => {
    try {
      const res = await api.getProducts();
      setCatalog(res.products);
    } catch (err: any) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleFileUpload = async (uploadedFile: File) => {
    // Validate file type & size (max 5MB)
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(uploadedFile.type)) {
      setErrorMessage('Invalid file type! Only JPG, PNG, and PDF files under 5MB are accepted.');
      return;
    }

    if (uploadedFile.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB limit.');
      return;
    }

    setErrorMessage(null);
    setFile(uploadedFile);
    setExtracting(true);

    try {
      const formData = new FormData();
      formData.append('invoiceFile', uploadedFile);

      const res = await api.uploadInvoice(formData);
      setDraftInvoice(res.draftInvoice);
      setValidation(res.validation);
    } catch (err: any) {
      setErrorMessage(err.message || 'OCR parsing failed.');
    } finally {
      setExtracting(false);
    }
  };

  const handleLoadSample = async (presetId: string) => {
    setErrorMessage(null);
    setExtracting(true);

    try {
      const formData = new FormData();
      formData.append('presetId', presetId);

      const res = await api.uploadInvoice(formData);
      setDraftInvoice(res.draftInvoice);
      setValidation(res.validation);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sample invoice.');
    } finally {
      setExtracting(false);
    }
  };

  const updateLineItem = (lineId: string, updates: Partial<InvoiceLineItem>) => {
    if (!draftInvoice) return;

    const newItems = draftInvoice.items.map((item) => {
      if (item.id === lineId) {
        const updated = { ...item, ...updates };
        // Recalculate line total
        updated.lineTotalPaise = Math.round(updated.quantity * updated.unitPricePaise);
        return updated;
      }
      return item;
    });

    const newTotal = newItems.reduce((acc, curr) => acc + curr.lineTotalPaise, 0);

    setDraftInvoice({
      ...draftInvoice,
      items: newItems,
      totalAmountPaise: newTotal,
    });
  };

  const removeLineItem = (lineId: string) => {
    if (!draftInvoice) return;
    const newItems = draftInvoice.items.filter((i) => i.id !== lineId);
    const newTotal = newItems.reduce((acc, curr) => acc + curr.lineTotalPaise, 0);

    setDraftInvoice({
      ...draftInvoice,
      items: newItems,
      totalAmountPaise: newTotal,
    });
  };

  const handleConfirmInvoice = async () => {
    if (!draftInvoice) return;
    setErrorMessage(null);
    setConfirming(true);

    try {
      const res = await api.confirmInvoice(draftInvoice);
      setSuccessMessage(res.message);
      onInvoiceConfirmed();
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 select-none">
      <div 
        className="card-sharp bg-white border border-[#0F392B] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl"
        style={{ borderRadius: '0px' }}
      >
        {/* Header */}
        <div className="bg-[#0F392B] text-white p-3.5 flex items-center justify-between border-b border-[#0A251C]">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider">
              Purchase Invoice OCR Import & Reconciliation (§03)
            </h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-emerald-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Owner Role Notice */}
          {!isOwner && (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] p-3 text-xs font-mono flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Staff Permission Guard:</strong> You are signed in as Staff (Priya). You can preview OCR extraction, but only store owners (Ramesh) have authority to approve and confirm purchase invoices.
              </span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] p-3 text-xs font-mono flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] p-3 text-xs font-mono flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Upload or Sample Preset Selection */}
          {!draftInvoice && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-[#D8DDD8] p-8 text-center space-y-3 bg-[#F9FAF9] hover:border-[#0F392B] transition-colors">
                <Upload className="w-10 h-10 text-[#0F392B] mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-[#111814] font-mono">
                    Drop Supplier Invoice (JPG, PNG, PDF &lt; 5MB)
                  </h3>
                  <p className="text-xs text-[#637069] mt-1 font-mono">
                    OCR extracts supplier name, invoice number, date, and line items.
                  </p>
                </div>
                <div>
                  <label className="btn-sharp bg-[#0F392B] hover:bg-[#0A251C] text-white border border-[#0A251C] text-xs font-mono py-1.5 px-4 cursor-pointer inline-block">
                    SELECT FILE
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Instant Test Presets for Judges (§07 Prototype Testing) */}
              <div className="card-sharp bg-white border border-[#D8DDD8] p-4">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#0F392B] mb-2 flex items-center space-x-1.5">
                  <FileCheck className="w-4 h-4" />
                  <span>Instant Hackathon Test Invoices (1-Click Load)</span>
                </div>
                <p className="text-xs text-[#637069] font-mono mb-3">
                  Judges can test OCR extraction, product matching, and reconciliation without uploading external files:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    disabled={extracting}
                    onClick={() => handleLoadSample('sample_kirana_01')}
                    className="text-left p-2.5 border border-[#D8DDD8] hover:border-[#0F392B] hover:bg-[#F0F4F2] transition-colors text-xs font-mono"
                  >
                    <div className="font-bold text-[#0F392B]">Gujarat Agro Foods</div>
                    <div className="text-[10px] text-[#637069]">INV-GA-2026-981 (Oil, Biscuits, Tea)</div>
                    <div className="text-[10px] font-bold text-[#111814] mt-1">₹4,800.00 • 4 items</div>
                  </button>

                  <button
                    disabled={extracting}
                    onClick={() => handleLoadSample('sample_fmcg_02')}
                    className="text-left p-2.5 border border-[#D8DDD8] hover:border-[#0F392B] hover:bg-[#F0F4F2] transition-colors text-xs font-mono"
                  >
                    <div className="font-bold text-[#0F392B]">Vadodara Super Stockists</div>
                    <div className="text-[10px] text-[#637069]">INV-VSS-7712 (Soap, Noodles, Salt)</div>
                    <div className="text-[10px] font-bold text-[#111814] mt-1">₹3,500.00 • 3 items</div>
                  </button>

                  <button
                    disabled={extracting}
                    onClick={() => handleLoadSample('sample_pharma_03')}
                    className="text-left p-2.5 border border-[#D8DDD8] hover:border-[#0F392B] hover:bg-[#F0F4F2] transition-colors text-xs font-mono"
                  >
                    <div className="font-bold text-[#0F392B]">Apollo Med Distributors</div>
                    <div className="text-[10px] text-[#637069]">INV-APO-9011 (Dolo, Syrup, Bandages)</div>
                    <div className="text-[10px] font-bold text-[#111814] mt-1">₹2,900.00 • 3 items</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Editable Review Table (§03: "OCR suggests, the owner confirms") */}
          {draftInvoice && (
            <div className="space-y-4">
              {/* Duplicate Invoice Warning Alert */}
              {validation?.hasDuplicateWarning && (
                <div className="bg-[#FEF2F2] border-2 border-[#DC2626] text-[#991B1B] p-3 text-xs font-mono flex items-start space-x-2">
                  <ShieldAlert className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm uppercase">Duplicate Invoice Detected (§03 Safety)</div>
                    <div>
                      Invoice #{draftInvoice.invoiceNumber} from '{draftInvoice.supplierName}' was already confirmed on {validation.duplicateDetails?.confirmedAt ? new Date(validation.duplicateDetails.confirmedAt).toLocaleDateString() : 'earlier date'}.
                    </div>
                    <div className="text-[11px] text-[#7F1D1D] mt-0.5 font-bold">
                      Confirming again will be rejected to prevent doubling stock count.
                    </div>
                  </div>
                </div>
              )}

              {/* Header Details Card */}
              <div className="card-sharp bg-[#F9FAF9] border border-[#D8DDD8] p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[#637069] text-[10px]">Supplier:</span>
                  <input
                    type="text"
                    value={draftInvoice.supplierName}
                    onChange={(e) => setDraftInvoice({ ...draftInvoice, supplierName: e.target.value })}
                    className="w-full bg-white border border-[#D8DDD8] px-2 py-1 font-bold text-[#111814]"
                  />
                </div>
                <div>
                  <span className="text-[#637069] text-[10px]">Invoice #:</span>
                  <input
                    type="text"
                    value={draftInvoice.invoiceNumber}
                    onChange={(e) => setDraftInvoice({ ...draftInvoice, invoiceNumber: e.target.value })}
                    className="w-full bg-white border border-[#D8DDD8] px-2 py-1 font-bold text-[#111814]"
                  />
                </div>
                <div>
                  <span className="text-[#637069] text-[10px]">Invoice Date:</span>
                  <input
                    type="date"
                    value={draftInvoice.invoiceDate}
                    onChange={(e) => setDraftInvoice({ ...draftInvoice, invoiceDate: e.target.value })}
                    className="w-full bg-white border border-[#D8DDD8] px-2 py-1 font-bold text-[#111814]"
                  />
                </div>
                <div>
                  <span className="text-[#637069] text-[10px]">Total Amount:</span>
                  <div className="font-bold text-sm text-[#0F392B] pt-1">
                    {formatPaise(draftInvoice.totalAmountPaise)}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="card-sharp bg-white border border-[#D8DDD8] overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-[#0F392B] text-white text-[11px] uppercase border-b border-[#0A251C]">
                      <th className="p-2.5">Extracted Line Name</th>
                      <th className="p-2.5">Matched Catalog SKU</th>
                      <th className="p-2.5 text-right w-20">Qty</th>
                      <th className="p-2.5 text-right w-28">Unit Cost (₹)</th>
                      <th className="p-2.5 text-right w-28">Line Total</th>
                      <th className="p-2.5 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8DDD8]">
                    {draftInvoice.items.map((line) => (
                      <tr key={line.id} className="hover:bg-[#F9FAF9]">
                        <td className="p-2 font-medium">
                          <input
                            type="text"
                            value={line.rawProductName}
                            onChange={(e) => updateLineItem(line.id, { rawProductName: e.target.value })}
                            className="w-full bg-transparent border-b border-transparent hover:border-[#D8DDD8] focus:border-[#0F392B] px-1 py-0.5"
                          />
                          {line.isArithmeticMismatch && (
                            <div className="text-[10px] text-[#DC2626] font-bold">
                              Arithmetic check failed (Qty × Unit ≠ Total)
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <select
                            value={line.isNewProduct ? 'NEW' : line.matchedProductId || 'NEW'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'NEW') {
                                updateLineItem(line.id, { isNewProduct: true, matchedProductId: undefined });
                              } else {
                                const found = catalog.find((c) => c.id === val);
                                updateLineItem(line.id, {
                                  isNewProduct: false,
                                  matchedProductId: val,
                                  matchedProductName: found?.name,
                                });
                              }
                            }}
                            className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-2 py-1 text-xs"
                          >
                            <option value="NEW">+ Create As New Product</option>
                            {catalog.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.sku} - {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="any"
                            value={line.quantity}
                            onChange={(e) => updateLineItem(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-1.5 py-1 text-right font-bold"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={(line.unitPricePaise / 100).toFixed(2)}
                            onChange={(e) =>
                              updateLineItem(line.id, { unitPricePaise: parseRupeesToPaise(e.target.value) })
                            }
                            className="w-full bg-[#F9FAF9] border border-[#D8DDD8] px-1.5 py-1 text-right font-bold"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-[#0F392B]">
                          {formatPaise(line.lineTotalPaise)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => removeLineItem(line.id)}
                            className="text-[#637069] hover:text-[#DC2626]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Reconciliation Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#D8DDD8] pt-4 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDraftInvoice(null);
                    setFile(null);
                  }}
                  className="btn-sharp bg-white hover:bg-neutral-100 text-[#111814] border border-[#D8DDD8] text-xs font-mono py-1.5 px-3"
                >
                  ← Upload Different Invoice
                </button>

                <div className="flex items-center space-x-3">
                  <div className="text-right text-xs font-mono">
                    <span className="text-[#637069]">Sum of Lines: </span>
                    <strong className="text-[#0F392B] text-sm">
                      {formatPaise(draftInvoice.totalAmountPaise)}
                    </strong>
                  </div>

                  <button
                    disabled={!isOwner || confirming || validation?.hasDuplicateWarning}
                    onClick={handleConfirmInvoice}
                    className="btn-sharp bg-[#047857] hover:bg-[#059669] text-white border border-[#065F46] text-xs font-mono py-2 px-4 font-bold disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {confirming
                        ? 'CREATING PURCHASE MOVEMENTS...'
                        : 'CONFIRM & ADD TO STOCK'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
