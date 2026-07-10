export interface AppReleaseInfo {
  version: string;
  versionCode: number;
  minSupportedVersionCode: number;
  mandatory: boolean;
  releaseNotes: string;
  sha256: string;
  sizeBytes: number;
  publishedAt: string;
  updateAvailable: boolean;
  updateRequired: boolean;
  clientVersionCode: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode?: number;
}

export interface AppUpdateProgress {
  phase: 'checking' | 'downloading' | 'verifying' | 'installing';
  percent?: number;
}
