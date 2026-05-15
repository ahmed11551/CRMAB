export type ProjectStatus = "Planning" | "In Progress" | "Completed" | "On Hold";
export type TaskStatus = "Pending" | "In Progress" | "Resolved";
export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type CommType = "Call" | "WhatsApp" | "Telegram" | "Email" | "Visit";
export type FinType = "Income" | "Expense" | "Debt";
export type FinStatus = "Pending" | "Paid";

export interface Contact {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  address?: string;
  status: ProjectStatus;
  contractorIds: string[];
  budget?: number;
  expenses?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface CRMTask {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string; // Contact ID
  projectId?: string; // Project ID
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  reminderAt?: string; // ISO string with time
  reminderDismissed?: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface Communication {
  id: string;
  contactId: string;
  type: CommType;
  content: string;
  sender: string;
  timestamp: string;
}

export interface Financial {
  id: string;
  projectId?: string;
  contactId?: string;
  type: FinType;
  amount: number;
  description: string;
  status: FinStatus;
  date: string;
  createdAt: string;
}

export interface TravelLog {
  id: string;
  userId: string;
  projectId?: string;
  destination: string;
  purpose: string;
  date: string;
  cost: number;
}
