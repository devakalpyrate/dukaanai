import { Customer, Product, Transaction, Supplier, PurchaseOrder, Invoice, AutomationTask, UserProfile } from '../types';
import { sanitizeErrorMessage, SAFE_MESSAGES } from '../utils/errorHandler';

const API_BASE = 'http://127.0.0.1:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('dukaanai_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const ApiService = {
  getUserProfile: async (): Promise<UserProfile | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && data.user) {
        return {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: 'Store Owner',
          shop_id: data.shop?.id || 0,
          shop_name: data.shop?.name || 'My Dukaan',
        };
      }
    } catch {}
    return null;
  },

  updateUserProfile: async (data: Partial<UserProfile>): Promise<UserProfile | null> => {
    return null;
  },

  getDashboardStats: async () => {
    try {
      const [txRes, prodRes] = await Promise.all([
        fetch(`${API_BASE}/api/transactions`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/products`, { headers: getAuthHeaders() }),
      ]);
      const txData = txRes.ok ? await txRes.json() : { data: [] };
      const prodData = prodRes.ok ? await prodRes.json() : { data: [] };

      const txList = txData.data || [];
      const prodList = prodData.data || [];

      let todaySales = 0;
      let outstanding = 0;
      let payments = 0;

      for (const t of txList) {
        const amt = Number(t.amount) || 0;
        if (t.type === 'credit') {
          todaySales += amt;
          outstanding += amt;
        } else if (t.type === 'payment') {
          payments += amt;
        }
      }

      return {
        todaySales,
        todayTransactions: txList.length,
        totalOutstandingCredit: outstanding,
        paymentsReceivedToday: payments,
        activeCustomers: txList.length,
        lowStockItemsCount: prodList.filter((p: any) => (p.stock || 0) <= 5).length,
        salesTrend: [
          { day: 'Mon', sales: 0 },
          { day: 'Tue', sales: 0 },
          { day: 'Wed', sales: 0 },
          { day: 'Thu', sales: 0 },
          { day: 'Fri', sales: 0 },
          { day: 'Sat', sales: 0 },
          { day: 'Sun', sales: todaySales },
        ],
      };
    } catch {
      return {
        todaySales: 0,
        todayTransactions: 0,
        totalOutstandingCredit: 0,
        paymentsReceivedToday: 0,
        activeCustomers: 0,
        lowStockItemsCount: 0,
        salesTrend: [],
      };
    }
  },

  getCustomers: async (): Promise<Customer[]> => {
    try {
      const res = await fetch(`${API_BASE}/api/customers`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || 'N/A',
        total_credit: Number(c.total_credit) || 0,
        total_paid: Number(c.total_paid) || 0,
        balance: Number(c.balance) || 0,
        last_transaction: c.last_transaction || 'Recently recorded',
        status: (Number(c.balance) || 0) > 0 ? 'overdue' : 'cleared',
      }));
    } catch {
      return [];
    }
  },

  getCustomerTransactions: async (customerId: number): Promise<Transaction[]> => {
    try {
      const res = await fetch(`${API_BASE}/api/customers/${customerId}/transactions`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []).map((t: any) => ({
        id: `TXN-${t.id}`,
        timestamp: t.created_at || 'Recently',
        customer_name: '',
        type: t.type || 'credit',
        amount: Number(t.amount) || 0,
        items: t.description || (t.type === 'credit' ? 'Udhaar Record' : 'Cash Payment Received'),
        status: 'completed',
        invoice_id: t.idempotency_key ? `ID-${t.idempotency_key.substring(0, 8)}` : undefined,
      }));
    } catch {
      return [];
    }
  },

  recordTransaction: async (data: { customer_name: string; amount: number; type: 'credit' | 'payment'; description?: string }): Promise<boolean> => {
    try {
      const userStr = localStorage.getItem('dukaanai_user');
      let shopId = 1;
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.shop_id) shopId = u.shop_id;
        } catch {}
      }
      const action = data.type === 'credit' ? 'record_credit' : 'record_payment';
      const intent_data = {
        intent: 'credit_transaction',
        action,
        parameters: {
          customer_name: data.customer_name,
          amount: data.amount.toString(),
          shop_id: shopId,
        },
        entities: { customer: data.customer_name },
      };
      const res = await fetch(`${API_BASE}/api/action/execute`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ intent_data, confirmed: true }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  addCustomer: async (customer: { name: string; phone?: string }): Promise<Customer | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/customers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(customer),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(sanitizeErrorMessage(errJson, SAFE_MESSAGES.CUSTOMER_FAILED));
      }
      const json = await res.json();
      const c = json.data;
      return {
        id: c.id,
        name: c.name,
        phone: c.phone || 'N/A',
        total_credit: 0,
        total_paid: 0,
        balance: 0,
        last_transaction: 'Just now',
        status: 'cleared',
      };
    } catch (err: any) {
      throw new Error(sanitizeErrorMessage(err, SAFE_MESSAGES.CUSTOMER_FAILED));
    }
  },

  getProducts: async (): Promise<Product[]> => {
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []).map((p: any) => {
        const stockQty = Number(p.stock ?? p.quantity) || 0;
        const pricePerUnit = Number(p.price) || 0;
        const lowStock = Number(p.low_stock_limit) || 5;
        return {
          id: p.id,
          name: p.name,
          category: 'General Kirana',
          price: pricePerUnit,
          unit: p.unit || 'kg',
          stock: stockQty,
          quantity: stockQty,
          total_value: Number(p.total_value) || Math.round(stockQty * pricePerUnit * 100) / 100,
          min_stock_alert: lowStock,
          status: stockQty <= 0 ? 'out_of_stock' : stockQty <= lowStock ? 'low_stock' : 'in_stock',
          last_restocked: 'Recorded',
        };
      });
    } catch {
      return [];
    }
  },

  addProduct: async (product: { name: string; category?: string; price: number; unit: string; quantity?: number; low_stock_limit?: number }): Promise<Product | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          unit: product.unit,
          quantity: product.quantity ?? 0,
          low_stock_limit: product.low_stock_limit ?? 5,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(sanitizeErrorMessage(errData, SAFE_MESSAGES.PRODUCT_FAILED));
      }
      const json = await res.json();
      const p = json.data;
      const stockQty = Number(p.quantity ?? p.stock) || 0;
      const pricePerUnit = Number(p.price) || 0;
      return {
        id: p.id,
        name: p.name,
        category: product.category || 'General Kirana',
        price: pricePerUnit,
        unit: p.unit || 'kg',
        stock: stockQty,
        quantity: stockQty,
        total_value: Number(p.total_value) || Math.round(stockQty * pricePerUnit * 100) / 100,
        min_stock_alert: 5,
        status: stockQty <= 0 ? 'out_of_stock' : 'in_stock',
        last_restocked: 'Just now',
      };
    } catch (err: any) {
      throw err;
    }
  },

  markNotificationsBatchRead: async (notificationIds: number[]): Promise<boolean> => {
    if (!notificationIds.length) return true;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/batch-read`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notification_ids: notificationIds }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  dismissNotificationsBatch: async (notificationIds: number[]): Promise<boolean> => {
    if (!notificationIds.length) return true;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/batch-dismiss`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notification_ids: notificationIds }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  getTransactions: async (): Promise<Transaction[]> => {
    try {
      const res = await fetch(`${API_BASE}/api/transactions`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []).map((t: any) => ({
        id: `TXN-${t.id}`,
        timestamp: t.created_at || 'Recently',
        customer_name: t.customer_name || `Customer #${t.customer_id}`,
        type: t.type || 'credit',
        amount: Number(t.amount) || 0,
        items: t.note || 'Recorded transaction',
        status: 'completed',
        invoice_id: t.idempotency_key ? `ID-${t.idempotency_key.substring(0, 8)}` : undefined,
      }));
    } catch {
      return [];
    }
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    return [];
  },

  getOrders: async (): Promise<PurchaseOrder[]> => {
    return [];
  },

  getInvoices: async (): Promise<Invoice[]> => {
    return [];
  },

  getAutomations: async (): Promise<AutomationTask[]> => {
    return [];
  },

  toggleAutomation: async (id: string, enabled: boolean): Promise<boolean> => {
    return true;
  },
};
