export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // Simple auth for demo
  avatarUrl?: string;
  position?: string;
}

export type TaskFrequency = 'DAILY' | 'WEEKLY';

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedToUserId: string;
  
  frequency: TaskFrequency;
  
  // Recurrence logic (Internal use for legacy compatibility if needed, but simplified for new logic)
  repeatDays?: number[]; 
  scheduledDate?: string; 
  
  lastCompletedDate: string | null; // ISO Date string YYYY-MM-DD
  createdAt: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
}

export type NotificationType = 'BROADCAST' | 'TASK_COMPLETED';

export interface AppNotification {
    id: string;
    type: NotificationType;
    message: string;
    timestamp: number;
    fromUserName?: string;
}