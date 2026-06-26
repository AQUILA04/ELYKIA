export const AiPermissions = {
  Chat: 'ROLE_AI_CHAT',
  Report: 'ROLE_AI_REPORT',
} as const;

export type AiPermission = (typeof AiPermissions)[keyof typeof AiPermissions];
