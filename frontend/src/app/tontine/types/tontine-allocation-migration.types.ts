export interface TontineAllocationMigrationStatus {
  running: boolean;
  fromVersion?: string | null;
  toVersion?: string | null;
  processedMembers: number;
  totalMembers: number;
  failedMembers: number;
  startedAt?: string | null;
  status?: string | null;
}
