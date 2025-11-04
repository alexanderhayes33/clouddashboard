import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface CloudUser {
  id: string
  email: string
  password_hash: string
  full_name?: string
  phone?: string
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
}

export interface CloudSubscription {
  id: string
  user_id: string
  plan_name: string
  plan_type: 'monthly' | 'quarterly' | 'yearly' | 'lifetime'
  amount: number
  currency: string
  status: 'active' | 'expired' | 'cancelled' | 'pending'
  start_date: string
  expiry_date: string
  created_at: string
  updated_at: string
}

export interface CloudBilling {
  id: string
  user_id: string
  subscription_id?: string
  amount: number
  currency: string
  payment_method?: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_date?: string
  transaction_id?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface MachineSpecs {
  cpu?: string
  ram?: string
  storage?: string
  bandwidth?: string
  os?: string
  gpu?: string
  [key: string]: any
}

export interface CloudInvoice {
  id: string
  user_id: string
  invoice_number: string
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  due_date: string
  description?: string
  payment_method?: string
  payment_id?: string
  transaction_id?: string
  paid_at?: string
  created_by?: string
  machine_specs?: MachineSpecs
  usage_limit_per_month?: number
  usage_count?: number
  machine_info?: any
  created_at: string
  updated_at: string
}

export interface CloudMachineService {
  id: string
  user_id: string
  invoice_id: string
  service_name: string
  machine_type: string
  machine_specs: MachineSpecs
  usage_limit_per_month: number
  usage_count: number
  start_date: string
  expiry_date: string
  status: 'active' | 'expired' | 'suspended' | 'cancelled'
  created_at: string
  updated_at: string
}

