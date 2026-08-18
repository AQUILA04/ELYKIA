export const LIVE_ACCOUNTS = {
  recoveryManager: {
    username: process.env['E2E_RM_USERNAME'] ?? 'recov001',
    password: process.env['E2E_RM_PASSWORD'] ?? 'Recover1234',
  },
  commercial: {
    username: process.env['E2E_COMMERCIAL_USERNAME'] ?? 'COM020',
    password: process.env['E2E_COMMERCIAL_PASSWORD'] ?? 'ChangeMe020',
  },
  gestionnaire: {
    username: process.env['E2E_GES003_USERNAME'] ?? 'ges003',
    password: process.env['E2E_GES003_PASSWORD'] ?? 'Abcd1234',
  },
} as const;

