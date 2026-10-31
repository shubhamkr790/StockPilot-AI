import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardMetrics } from './components/DashboardMetrics';
import { ProductCatalog } from './components/ProductCatalog';
import { RestockBoard } from './components/RestockBoard';
import { StaffPOSModal } from './components/StaffPOSModal';
import { OCRInvoiceModal } from './components/OCRInvoiceModal';
import { TestLabModal } from './components/TestLabModal';
import { AuditLedgerModal } from './components/AuditLedgerModal';
import { PitchDeckModal } from './components/PitchDeckModal';
import { api } from './services/api';
import { Business, UserProfile, DashboardMetrics as MetricsType } from './types';

export const App: React.FC = () => {
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<UserProfile[]>([]);
  const [metrics, setMetrics] = useState<MetricsType | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'restock' | 'ledger' | 'invoices'>('dashboard');

  // Modals
  const [isPOSOpen, setIsPOSOpen] = useState(false);
  const [isOCROpen, setIsOCROpen] = useState(false);
  const [isTestLabOpen, setIsTestLabOpen] = useState(false);
  const [isPitchDeckOpen, setIsPitchDeckOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const [accRes, sessRes] = await Promise.all([
        api.getDemoAccounts(),
        api.getCurrentSession(),
      ]);

      setDemoAccounts(accRes.accounts);
      setCurrentBusiness(sessRes.business);
      setCurrentUser({
        userId: sessRes.user.id,
        name: sessRes.user.name,
        role: sessRes.user.role,
        businessId: sessRes.business.id,
        businessName: sessRes.business.name,
        businessType: sessRes.business.type,
        avatarInitials: sessRes.user.name.slice(0, 2).toUpperCase(),
      });
      setMetrics(sessRes.metrics);
    } catch (err: any) {
      console.error('App init error:', err);
    }
  };

  const handleSwitchUser = async (account: UserProfile) => {
    api.setSession(account.businessId, account.userId);
    await initApp();
  };

  const refreshMetrics = async () => {
    try {
      const res = await api.getDashboardMetrics();
      setMetrics(res.metrics);
    } catch (err: any) {
      console.error('Metrics refresh error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAF9] text-[#111814] flex flex-col font-sans">
      {/* Brutalist Sharp Navbar */}
      <Navbar
        currentBusiness={currentBusiness}
        currentUser={currentUser}
        demoAccounts={demoAccounts}
        onSwitchUser={handleSwitchUser}
        onOpenPOS={() => setIsPOSOpen(true)}
        onOpenOCR={() => setIsOCROpen(true)}
        onOpenTestLab={() => setIsTestLabOpen(true)}
        onOpenPitchDeck={() => setIsPitchDeckOpen(true)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'ledger') {
            setIsLedgerOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        
        {/* Top Executive Dashboard Metrics Bar */}
        <DashboardMetrics
          metrics={metrics}
          onNavigateToRestock={() => setActiveTab('restock')}
        />

        {/* View Switching */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Split View on Dashboard: Restock Action Board + Quick Product Table */}
            <RestockBoard />
            <div className="pt-6 border-t border-[#D8DDD8]">
              <ProductCatalog
                currentUser={currentUser}
                onRefreshMetrics={refreshMetrics}
              />
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <ProductCatalog
            currentUser={currentUser}
            onRefreshMetrics={refreshMetrics}
          />
        )}

        {activeTab === 'restock' && (
          <RestockBoard />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#D8DDD8] bg-white py-4 text-xs font-mono text-[#637069] text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>StockPilot AI</strong> • Built for MedaVida Intern Hackathon Challenge
          </div>
          <div>
            Double-Entry Ledger • Explainable Forecasting • Zero Float Drift (Paise)
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <StaffPOSModal
        isOpen={isPOSOpen}
        onClose={() => setIsPOSOpen(false)}
        currentUser={currentUser}
        onSaleComplete={refreshMetrics}
      />

      <OCRInvoiceModal
        isOpen={isOCROpen}
        onClose={() => setIsOCROpen(false)}
        currentUser={currentUser}
        onInvoiceConfirmed={refreshMetrics}
      />

      <TestLabModal
        isOpen={isTestLabOpen}
        onClose={() => setIsTestLabOpen(false)}
      />

      <AuditLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
      />

      <PitchDeckModal
        isOpen={isPitchDeckOpen}
        onClose={() => setIsPitchDeckOpen(false)}
      />
    </div>
  );
};
export default App;
