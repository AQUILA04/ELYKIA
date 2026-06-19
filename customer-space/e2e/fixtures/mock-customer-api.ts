export const MOCK_SESSION = {
  token: 'e2e-mock-jwt-token',
  refreshToken: 'e2e-refresh',
  tokenType: 'Bearer',
  clientId: '42',
  fullName: 'Jean K. Mensah',
  phone: '90123456',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

export const MOCK_DASHBOARD = {
  clientId: '42',
  fullName: 'Jean K. Mensah',
  activeCreditCount: 1,
  totalCreditAmount: 350_000,
  totalPaidAmount: 120_000,
  totalRemainingAmount: 230_000,
  nextPaymentAmount: 35_000,
  nextPaymentDate: '2026-06-20',
  progressPercent: 34.3,
  recentActivities: [
    {
      id: '1',
      type: 'RECOVERY',
      label: 'Mise #12 validée',
      amount: 35_000,
      date: '2026-06-17',
      status: 'VALIDE',
    },
    {
      id: '2',
      type: 'ORDER',
      label: 'Commande CMD-2026-001',
      amount: 85_000,
      date: '2026-06-10',
      status: 'INITIE',
    },
  ],
};

export function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}
