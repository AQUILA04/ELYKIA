export const MOCK_SESSION = {
  token: 'e2e-mock-jwt-token',
  refreshToken: 'e2e-refresh',
  tokenType: 'Bearer',
  clientId: '42',
  fullName: 'Jean K. Mensah',
  phone: '90123456',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

export const MOCK_PURCHASE_ID = '101';

export const MOCK_DASHBOARD = {
  clientId: '42',
  fullName: 'Jean K. Mensah',
  activeCreditCount: 1,
  totalCreditAmount: 350_000,
  totalPaidAmount: 120_000,
  totalRemainingAmount: 230_000,
  nextPaymentAmount: 35_000,
  nextPaymentDate: '2026-06-20',
  nextPaymentCreditId: MOCK_PURCHASE_ID,
  nextInstallmentNumber: 3,
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
  ],
};

export const MOCK_PURCHASES = [
  {
    id: MOCK_PURCHASE_ID,
    reference: 'CRD-2026-0101',
    totalAmount: 350_000,
    paidAmount: 120_000,
    remainingAmount: 230_000,
    dailyPayment: 35_000,
    startDate: '2026-01-15',
    endDate: '2026-12-15',
    status: 'LIVRE',
    articleCount: 2,
    items: [],
    recoveries: [],
    installmentCount: 12,
    paidInstallmentCount: 4,
    lateInstallmentCount: 0,
    initiatedInstallmentCount: 1,
  },
];

export const MOCK_PURCHASE_DETAIL = {
  ...MOCK_PURCHASES[0],
  items: [
    {
      articleId: 'a1',
      articleName: 'Téléviseur 32"',
      quantity: 1,
      unitPrice: 200_000,
      totalPrice: 200_000,
    },
    {
      articleId: 'a2',
      articleName: 'Réfrigérateur',
      quantity: 1,
      unitPrice: 150_000,
      totalPrice: 150_000,
    },
  ],
};

export const MOCK_RECOVERIES = [
  { id: 'r1', installmentNumber: 1, amount: 35_000, paymentDate: '2026-02-01', status: 'VALIDE' },
  { id: 'r2', installmentNumber: 2, amount: 35_000, paymentDate: '2026-03-01', status: 'VALIDE' },
  { id: 'r3', installmentNumber: 3, amount: 35_000, paymentDate: '2026-04-01', status: 'INITIE' },
  { id: 'r4', installmentNumber: 4, amount: 35_000, paymentDate: '2026-05-01', status: 'RETARD' },
];

export const MOCK_ARTICLES = [
  {
    id: 'art-1',
    name: 'Mixeur électrique',
    commercialName: 'ELECTRO: Philips Philips 500W',
    displayName: 'ELECTRO: Philips Philips 500W Mixeur électrique',
    category: 'ELECTRO',
    creditSalePrice: 45_000,
    available: true,
  },
  {
    id: 'art-2',
    name: 'Ventilateur',
    commercialName: 'ELECTRO: Binatone Binatone 16"',
    displayName: 'ELECTRO: Binatone Binatone 16" Ventilateur',
    category: 'ELECTRO',
    creditSalePrice: 28_000,
    available: true,
  },
];

export const MOCK_TOP_ARTICLE_TYPES = [
  { type: 'ELECTRO', label: 'ELECTRO', totalQuantitySold: 120 },
  { type: 'HUILE', label: 'HUILE', totalQuantitySold: 95 },
];

export const MOCK_ORDER_RESPONSE = {
  orderId: 'ord-99',
  reference: 'CMD-2026-0099',
  status: 'INITIE',
  totalAmount: 73_000,
  createdAt: '2026-06-18T12:00:00',
};

export function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}
