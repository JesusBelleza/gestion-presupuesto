export type UserRole = 'JEFA_MARKETING' | 'JEFA_PRODUCTO';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
}

export interface AcademicYear {
  id: string;
  year: number;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
}

export interface Activity {
  id: string;
  categoryId: string;
  name: string;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  campaignMonths: number;
  studentGoal: number;
  salesGoal: number;
  totalBudget: number;
  productPrice: number;
  avgDiscount: number;
  modality: string;
  executiveDirector: string;
  costCenter: string;
  assignedProductManagers: string[]; // User IDs
}

export interface BudgetPlan {
  id: string;
  productId: string;
  activityId: string;
  month: string; // YYYY-MM
  amount: number;
}

export interface Expense {
  id: string;
  date: string;
  productId: string;
  activityId: string;
  categoryId: string;
  amount: number;
  description: string;
  provider: string;
  providerTypeId?: string;  // Tipo de proveedor
  attachmentUrls?: string[];   // multiple files
  attachmentUrl?: string;      // legacy single file
  sslNumber?: string;
  sslEmissionDate?: string;    // Fecha de emisión SSL
  accountingEntry?: string;    // # Partida contable
  registeredBy: string;
  createdAt: string;
}

export interface ProviderType {
  id: string;
  name: string;
  active: boolean;
}

export interface Provider {
  id: string;
  providerTypeId: string;
  name: string;
  active: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  details: string;
}
