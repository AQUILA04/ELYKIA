export const LIVE_ACCOUNTS = {
  recoveryManager: {
    username: process.env['E2E_RM_USERNAME'] ?? 'recov001',
    password: process.env['E2E_RM_PASSWORD'] ?? '',
  },
  commercial: {
    username: process.env['E2E_COMMERCIAL_USERNAME'] ?? 'COM020',
    password: process.env['E2E_COMMERCIAL_PASSWORD'] ?? '',
  },
  gestionnaire: {
    username: process.env['E2E_GES003_USERNAME'] ?? 'ges003',
    password: process.env['E2E_GES003_PASSWORD'] ?? '',
  },
} as const;

