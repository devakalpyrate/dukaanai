export type PageId =
  | 'overview'
  | 'voice-assistant'
  | 'customers'
  | 'products'
  | 'sales'
  | 'suppliers'
  | 'billing'
  | 'automation'
  | 'reports'
  | 'settings';

export type AssistantState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'executing'
  | 'speaking'
  | 'clarification'
  | 'success'
  | 'error';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  shop_id: number;
  shop_name: string;
  gstin?: string;
  upi_id?: string;
  address?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  total_credit: number;
  total_paid: number;
  balance: number;
  last_transaction: string;
  status: 'active' | 'cleared' | 'overdue';
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
  min_stock_alert: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  last_restocked: string;
}

export interface Transaction {
  id: string;
  timestamp: string;
  customer_name: string;
  type: 'credit' | 'payment';
  amount: number;
  items?: string;
  status: 'completed' | 'pending';
  invoice_id?: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  category: string;
  pending_orders: number;
  total_spend: number;
}

export interface PurchaseOrder {
  id: string;
  supplier_name: string;
  items: string;
  total_amount: number;
  status: 'ordered' | 'in_transit' | 'delivered';
  expected_delivery: string;
}

export interface Invoice {
  id: string;
  date: string;
  customer_name: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue';
  items_count: number;
}

export interface AutomationTask {
  id: string;
  title: string;
  description: string;
  schedule: string;
  type: 'statement' | 'reminder' | 'stock_alert';
  enabled: boolean;
  last_run?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  query: string;
  action: string;
  response: string;
  status: 'success' | 'clarification' | 'error';
}

export interface CanonicalIntent {
  success: boolean;
  intent: string;
  action: string;
  parameters: Record<string, any>;
  entities: Record<string, any>;
  original_text: string;
  normalized_text: string;
  normalization: Record<string, any>;
  confidence: number;
  requires_confirmation: boolean;
  clarification_needed: boolean;
  clarification_question?: string | null;
  error_message?: string | null;
}

export interface ActionExecutionResponse {
  success: boolean;
  action: string;
  result?: any;
  message: string;
  clarification_needed: boolean;
  clarification_question?: string | null;
  requires_confirmation: boolean;
  original_text: string;
  normalized_text: string;
  normalization_notes: Record<string, any>;
}
