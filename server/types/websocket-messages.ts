export interface InitialDataMessage {
  type: 'initial_data';
  timestamp: string;
  payload: {
    company: CompanyData;
    tasks: TaskData[];
    user: UserData;
  };
}

export interface CompanyDataMessage {
  type: 'company_data';
  timestamp: string;
  payload: CompanyData;
}

export interface TaskDataMessage {
  type: 'task_data';
  timestamp: string;
  payload: TaskData[];
}

interface CompanyData {
  id: number;
  name: string;
  onboarding_company_completed: boolean;
  risk_score: number | null;
  chosen_score: number | null;
  category: string;
  is_demo: boolean;
}

interface TaskData {
  id: number;
  title: string;
  description: string | null;
  task_type: string;
  task_scope: string;
  status: string;
  priority: string;
  progress: number;
  assigned_to: number | null;
  created_by: number | null;
  user_email: string | null;
  company_id: number | null;
  due_date: string | null;
  files_requested: string[] | null;
  files_uploaded: string[] | null;
  metadata: Record<string, any> | null;
}

interface UserData {
  id: number;
  email: string;
  company_id: number;
}