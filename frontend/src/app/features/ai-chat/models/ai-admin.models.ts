export interface FrequentQuestion {
  question: string;
  count: number;
}

export interface RejectedSqlEntry {
  question: string;
  sql?: string;
  error?: string;
  username?: string;
  createdAt: string;
}

export interface AiAdminStats {
  periodDays: number;
  frequentQuestions: FrequentQuestion[];
  rejectedSql: RejectedSqlEntry[];
  intentDistribution: Record<string, number>;
  averageDataLatencyMs: number;
}
