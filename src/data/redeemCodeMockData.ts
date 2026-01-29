export interface RedeemCode {
  id: string;
  code: string;
  type: string;
  creditAmount: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

export const mockRedeemCodes: RedeemCode[] = [
  {
    id: '1',
    code: 'WELCOME2024',
    type: 'signup',
    creditAmount: 50,
    expiresAt: '2026-12-31T23:59:59.000Z',
    isActive: true,
    createdAt: '2024-01-15T10:30:00.000Z',
  },
  {
    id: '2',
    code: 'PROMO100',
    type: 'promotion',
    creditAmount: 100,
    expiresAt: '2026-06-30T23:59:59.000Z',
    isActive: true,
    createdAt: '2024-02-01T14:00:00.000Z',
  },
  {
    id: '3',
    code: 'BETA50',
    type: 'beta',
    creditAmount: 50,
    expiresAt: '2025-03-31T23:59:59.000Z',
    isActive: false,
    createdAt: '2023-11-20T09:15:00.000Z',
  },
  {
    id: '4',
    code: 'VIP200',
    type: 'vip',
    creditAmount: 200,
    expiresAt: '2026-12-31T23:59:59.000Z',
    isActive: true,
    createdAt: '2024-03-10T16:45:00.000Z',
  },
];
