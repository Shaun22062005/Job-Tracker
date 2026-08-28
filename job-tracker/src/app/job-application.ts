export type ApplicationStatus = 'Applied' | 'Interviewing' | 'Offered' | 'Rejected' | 'Bookmarked';
export type CompanySlot = 'A' | 'B2' | 'B1' | 'C2' | 'C1' | 'C1(S)';

export interface JobApplication {
  id: number;
  user_id: number;
  company_name: string;
  role: string;
  status: ApplicationStatus | (string & {});
  applied_date: string;
  company_slot?: CompanySlot | (string & {}) | null;
  notes?: string | null;
  job_url?: string | null;
  interview_date?: string | null;
  is_starred?: boolean;
}

export interface JobApplicationCreate {
  company_name: string;
  role: string;
  status: ApplicationStatus | (string & {});
  applied_date: string;
  company_slot?: CompanySlot | (string & {}) | null;
  notes?: string | null;
  job_url?: string | null;
  interview_date?: string | null;
  is_starred?: boolean;
}
