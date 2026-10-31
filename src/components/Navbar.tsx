import React, { useState } from 'react';
import { 
  Building2, 
  User, 
  ShieldCheck, 
  ShoppingCart, 
  FileText, 
  Sparkles, 
  FlaskConical, 
  Layers, 
  Presentation, 
  ChevronDown, 
  Check, 
  Store 
} from 'lucide-react';
import { UserProfile, Business } from '../types';

interface NavbarProps {
  currentBusiness: Business | null;
  currentUser: UserProfile | null;
  demoAccounts: UserProfile[];
  onSwitchUser: (account: UserProfile) => void;
  onOpenPOS: () => void;
  onOpenOCR: () => void;
  onOpenTestLab: () => void;
  onOpenPitchDeck: () => void;
  activeTab: 'dashboard' | 'products' | 'restock' | 'ledger' | 'invoices';
  setActiveTab: (tab: 'dashboard' | 'products' | 'restock' | 'ledger' | 'invoices') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentBusiness,
  currentUser,
  demoAccounts,
  onSwitchUser,
  onOpenPOS,
  onOpenOCR,
  onOpenTestLab,
  onOpenPitchDeck,
  activeTab,
  setActiveTab,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#0F392B] border-b border-[#0A251C] text-white select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        
        {/* Brand & Active Business Badge */}
        <div className="flex items-center space-x-6">
          <div 
            onClick={() => setActiveTab('dashboard')} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-[#047857] flex items-center justify-center font-mono font-bold text-lg text-white border border-[#065F46]">
              SP
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-tight text-lg text-white">StockPilot</span>
                <span className="text-xs bg-[#047857] px-1.5 py-0.5 font-mono text-emerald-100 font-semibold uppercase">AI</span>
              </div>
              <div className="text-[10px] text-emerald-200 uppercase tracking-widest font-mono">
                MedaVida Retail OS
              </div>
            </div>
          </div>

          {/* Current Store Display */}
          <div className="hidden md:flex items-center space-x-2 pl-4 border-l border-[#0A251C]">
            <Store className="w-4 h-4 text-emerald-400" />
            <div className="text-xs">
              <span className="text-emerald-300 font-mono">STORE: </span>
              <span className="font-semibold text-white">{currentBusiness?.name || 'Loading...'}</span>
              <span className="ml-1 text-[10px] bg-[#0A251C] text-emerald-300 px-1 py-0.2 border border-[#047857]">
                {currentBusiness?.type}
              </span>
            </div>
          </div>
        </div>

        {/* Central Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider font-mono border ${
              activeTab === 'dashboard'
                ? 'bg-white text-[#0F392B] border-white'
                : 'text-emerald-100 border-transparent hover:border-[#047857] hover:bg-[#0A251C]'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider font-mono border ${
              activeTab === 'products'
                ? 'bg-white text-[#0F392B] border-white'
                : 'text-emerald-100 border-transparent hover:border-[#047857] hover:bg-[#0A251C]'
            }`}
          >
            Catalog & Stock
          </button>
          <button
            onClick={() => setActiveTab('restock')}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider font-mono border ${
              activeTab === 'restock'
                ? 'bg-white text-[#0F392B] border-white'
                : 'text-emerald-100 border-transparent hover:border-[#047857] hover:bg-[#0A251C]'
            }`}
          >
            Restock Forecast
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider font-mono border ${
              activeTab === 'ledger'
                ? 'bg-white text-[#0F392B] border-white'
                : 'text-emerald-100 border-transparent hover:border-[#047857] hover:bg-[#0A251C]'
            }`}
          >
            Movement Ledger
          </button>
        </nav>

        {/* Action Controls & User Persona Switcher */}
        <div className="flex items-center space-x-3">
          {/* Staff POS Quick Sale Button */}
          <button
            id="nav-pos-btn"
            onClick={onOpenPOS}
            className="btn-sharp bg-[#047857] hover:bg-[#059669] text-white border border-[#065F46] text-xs font-mono py-1.5 px-3 flex items-center space-x-1.5"
            title="Fast Staff POS Sale (<15s)"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="font-bold">POS SALE</span>
          </button>

          {/* OCR Invoice Upload Button (Owner feature) */}
          <button
            id="nav-ocr-btn"
            onClick={onOpenOCR}
            className="btn-sharp bg-[#0A251C] hover:bg-[#054632] text-emerald-200 border border-[#047857] text-xs font-mono py-1.5 px-3 flex items-center space-x-1.5"
            title="Upload Purchase Invoice via OCR"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">IMPORT INVOICE</span>
          </button>

          {/* Test Lab Button for Judges */}
          <button
            id="nav-test-lab-btn"
            onClick={onOpenTestLab}
            className="btn-sharp bg-[#111814] hover:bg-black text-[#34D399] border border-[#047857] text-xs font-mono py-1.5 px-2.5 flex items-center space-x-1"
            title="Interactive Concurrency & Security Test Harness for Judges"
          >
            <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">TEST LAB</span>
          </button>

          {/* Pitch Deck Modal Button */}
          <button
            id="nav-pitch-btn"
            onClick={onOpenPitchDeck}
            className="btn-sharp bg-white hover:bg-emerald-50 text-[#0F392B] border border-white text-xs font-mono py-1.5 px-2.5 flex items-center space-x-1 font-bold"
            title="View 8-Slide Pitch Deck (Print to PDF)"
          >
            <Presentation className="w-3.5 h-3.5 text-[#0F392B]" />
            <span className="hidden md:inline">SLIDES</span>
          </button>

          {/* User Persona Switcher */}
          <div className="relative">
            <button
              id="user-persona-toggle"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-2 bg-[#0A251C] border border-[#047857] px-2.5 py-1 text-xs hover:border-emerald-300"
            >
              <div className="w-5 h-5 bg-[#047857] flex items-center justify-center font-mono font-bold text-[10px] text-white">
                {currentUser?.avatarInitials || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[11px] font-bold leading-tight">{currentUser?.name}</div>
                <div className="text-[9px] font-mono text-emerald-300 leading-none">
                  {currentUser?.role === 'OWNER' ? '👑 OWNER' : '⚡ STAFF'}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-emerald-400" />
            </button>

            {/* Persona Switcher Dropdown */}
            {showUserDropdown && (
              <div 
                className="absolute right-0 mt-2 w-72 bg-white text-[#111814] border border-[#D8DDD8] shadow-2xl z-50 p-2"
                style={{ borderRadius: '0px' }}
              >
                <div className="text-[10px] uppercase tracking-wider font-mono text-[#637069] px-2 py-1 border-b border-[#D8DDD8] mb-1">
                  Switch Demo Account (Test Personas)
                </div>
                {demoAccounts.map((acc) => {
                  const isCurrent = acc.userId === currentUser?.userId;
                  return (
                    <div
                      key={acc.userId}
                      onClick={() => {
                        onSwitchUser(acc);
                        setShowUserDropdown(false);
                      }}
                      className={`flex items-center justify-between p-2 cursor-pointer border mb-1 transition-colors ${
                        isCurrent 
                          ? 'bg-[#0F392B] text-white border-[#0F392B]' 
                          : 'hover:bg-[#F0F4F2] border-transparent'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center space-x-1.5">
                          <span>{acc.name}</span>
                          <span className={`text-[9px] px-1 py-0.2 font-mono font-semibold ${
                            acc.role === 'OWNER' ? 'bg-[#047857] text-white' : 'bg-[#E5E7EB] text-[#111814]'
                          }`}>
                            {acc.role}
                          </span>
                        </div>
                        <div className={`text-[10px] font-mono ${isCurrent ? 'text-emerald-200' : 'text-[#637069]'}`}>
                          {acc.businessName}
                        </div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-emerald-300" />}
                    </div>
                  );
                })}
                <div className="text-[10px] text-[#637069] px-2 py-1 mt-1 bg-[#F9FAF9] border-t border-[#D8DDD8]">
                  Anita Medical data is 100% tenant-isolated from Ramesh General Store.
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
