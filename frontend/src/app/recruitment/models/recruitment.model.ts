export type JobOfferStatus = 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';
export type ApplicantGender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';

export interface JobOffer {
  id?: number;
  title: string;
  description?: string;
  highlights?: string[];
  status?: JobOfferStatus;
  imageUrl?: string;
  publishedAt?: string;
  withdrawnAt?: string;
  displayOrder?: number;
  createdDate?: string;
}

export interface JobOfferUpsert {
  title: string;
  description?: string;
  highlights?: string[];
  displayOrder?: number;
}

export interface JobApplication {
  id?: number;
  jobOfferId?: number;
  jobOfferTitle?: string;
  lastName: string;
  firstName: string;
  phone: string;
  email?: string;
  birthDate: string;
  gender: ApplicantGender;
  locality: string;
  cvFileName?: string;
  submittedAt?: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
