export const AuditPermissions = {
  Consult: 'ROLE_AUDIT',
} as const;

export type AuditPermission = (typeof AuditPermissions)[keyof typeof AuditPermissions];
