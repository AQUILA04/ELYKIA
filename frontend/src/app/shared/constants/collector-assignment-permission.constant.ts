export const CollectorAssignmentPermissions = {
  Client: 'ROLE_ASSIGN_CLIENT_COLLECTOR',
  Credit: 'ROLE_ASSIGN_CREDIT_COLLECTOR',
} as const;

export type CollectorAssignmentPermission =
  (typeof CollectorAssignmentPermissions)[keyof typeof CollectorAssignmentPermissions];
