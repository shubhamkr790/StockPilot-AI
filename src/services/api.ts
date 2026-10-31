import { 
  ProductStockSummary, 
  UserProfile, 
  DashboardMetrics, 
  InventoryMovement, 
  Invoice, 
  SaleTransaction 
} from '../types';

export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function parseRupeesToPaise(rupees: number | string): number {
  const val = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  return isNaN(val) ? 0 : Math.round(val * 100);
}

class ApiService {
  private currentBusinessId = 'biz_ramesh_01';
  private currentUserId = 'usr_ramesh';

  public setSession(businessId: string, userId: string) {
    this.currentBusinessId = businessId;
    this.currentUserId = userId;
    localStorage.setItem('stockpilot_business_id', businessId);
    localStorage.setItem('stockpilot_user_id', userId);
  }

  public getSession() {
    const bId = localStorage.getItem('stockpilot_business_id') || this.currentBusinessId;
    const uId = localStorage.getItem('stockpilot_user_id') || this.currentUserId;
    this.currentBusinessId = bId;
    this.currentUserId = uId;
    return { businessId: bId, userId: uId };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { businessId, userId } = this.getSession();

    const headers: Record<string, string> = {
      'x-business-id': businessId,
      'x-user-id': userId,
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const error: any = new Error(data.message || `API error ${response.status}`);
      error.statusCode = response.status;
      error.code = data.error;
      error.details = data.details;
      throw error;
    }

    return data;
  }

  // --- Auth & Demo Profiles ---
  public async getDemoAccounts(): Promise<{ accounts: UserProfile[] }> {
    return this.request('/api/auth/demo-accounts');
  }

  public async getCurrentSession(): Promise<{ business: any; user: any; metrics: DashboardMetrics }> {
    return this.request('/api/auth/current');
  }

  // --- Products ---
  public async getProducts(params?: { category?: string; q?: string; archived?: boolean }): Promise<{ products: ProductStockSummary[] }> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.q) query.append('q', params.q);
    if (params?.archived) query.append('archived', 'true');
    return this.request(`/api/products?${query.toString()}`);
  }

  public async getProduct(id: string): Promise<{ product: ProductStockSummary }> {
    return this.request(`/api/products/${id}`);
  }

  public async createProduct(productData: any): Promise<{ product: ProductStockSummary }> {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  public async updateProduct(id: string, updates: any): Promise<{ product: ProductStockSummary }> {
    return this.request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public async archiveProduct(id: string): Promise<{ message: string }> {
    return this.request(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }

  public async manualStockAdjustment(id: string, deltaQuantity: number, reason: string): Promise<{ product: ProductStockSummary }> {
    return this.request(`/api/products/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ deltaQuantity, reason }),
    });
  }

  // --- Sales (POS) ---
  public async recordSale(items: { productId: string; quantity: number }[], idempotencyKey?: string): Promise<{ sale: SaleTransaction }> {
    return this.request('/api/sales', {
      method: 'POST',
      body: JSON.stringify({ items, idempotencyKey }),
    });
  }

  public async getSalesHistory(): Promise<{ sales: SaleTransaction[] }> {
    return this.request('/api/sales');
  }

  // --- Invoices & OCR ---
  public async uploadInvoice(formData: FormData): Promise<any> {
    return this.request('/api/invoices/upload', {
      method: 'POST',
      body: formData,
    });
  }

  public async getSampleInvoices(): Promise<{ samples: any[] }> {
    return this.request('/api/invoices/samples');
  }

  public async confirmInvoice(invoice: Invoice): Promise<{ invoice: Invoice; message: string }> {
    return this.request('/api/invoices/confirm', {
      method: 'POST',
      body: JSON.stringify({ invoice }),
    });
  }

  public async getInvoices(): Promise<{ invoices: Invoice[] }> {
    return this.request('/api/invoices');
  }

  // --- Forecast & Restock ---
  public async getRestockRecommendations(): Promise<{ count: number; recommendations: any[] }> {
    return this.request('/api/forecast/recommendations');
  }

  public async resetSeedData(): Promise<{ message: string }> {
    return this.request('/api/forecast/reset-seed', {
      method: 'POST',
    });
  }

  // --- Ledger Movements ---
  public async getLedgerMovements(limit: number = 100): Promise<{ count: number; movements: InventoryMovement[] }> {
    return this.request(`/api/ledger/movements?limit=${limit}`);
  }

  public async getDashboardMetrics(): Promise<{ metrics: DashboardMetrics }> {
    return this.request('/api/ledger/metrics');
  }

  // --- Test Lab ---
  public async runConcurrencyTest(): Promise<any> {
    return this.request('/api/test/concurrency', { method: 'POST' });
  }

  public async runTenantIsolationTest(): Promise<any> {
    return this.request('/api/test/tenant-isolation', { method: 'POST' });
  }

  public async runDuplicateInvoiceTest(): Promise<any> {
    return this.request('/api/test/duplicate-invoice', { method: 'POST' });
  }

  public async runNegativeStockTest(): Promise<any> {
    return this.request('/api/test/negative-stock', { method: 'POST' });
  }

  public async runCurrencyIntegrityTest(): Promise<any> {
    return this.request('/api/test/currency-integrity', { method: 'POST' });
  }
}

export const api = new ApiService();
