export interface JobApplication {
  id: number;
  user_id: number;
  company_name: string;
  role: string;
  status: 'Applied' | 'Interviewing' | 'Offered' | 'Rejected' | 'Bookmarked' | string;
  applied_date: string;
  notes?: string | null;
  job_url?: string | null;
  interview_date?: string | null;
}

export interface JobApplicationCreate {
  company_name: string;
  role: string;
  status: string;
  applied_date: string;
  notes?: string | null;
  job_url?: string | null;
  interview_date?: string | null;
}
