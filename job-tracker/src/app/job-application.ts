export type ApplicationStatus = 'Applied' | 'Interviewing' | 'Offered' | 'Rejected' | 'Bookmarked';

export interface JobApplication {
  id: number;
  user_id: number;
  company_name: string;
  role: string;
  status: ApplicationStatus | (string & {});
  applied_date: string;
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
  notes?: string | null;
  job_url?: string | null;
  interview_date?: string | null;
  is_starred?: boolean;
}
