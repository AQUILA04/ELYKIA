import { DailyOperationLog } from 'src/app/report/models/daily-operation-log.model';

const TYPE_LABELS: Record<string, string> = {
  CREDIT_COLLECTION: 'a enregistré un recouvrement crédit',
  CREDIT_COLLECTION_CANCEL: 'a annulé un recouvrement crédit',
  TONTINE_COLLECTION: 'a effectué une collecte tontine',
  TONTINE_COLLECTION_CANCEL: 'a annulé une collecte tontine',
  ORDER: 'a passé une commande',
  NEW_ACCOUNT: 'a ouvert un compte',
  CASH_DEPOSIT: 'a effectué un dépôt de caisse',
  STOCK_RETURN: 'a enregistré un retour de stock',
  STOCK_REQUEST: 'a demandé une sortie de stock',
  CASH_DEPOSIT_CANCEL: 'a annulé un dépôt de caisse',
  STOCK_TONTINE_REQUEST: 'a demandé une sortie stock tontine',
  STOCK_TONTINE_RETURN: 'a enregistré un retour stock tontine',
  TONTINE_DELIVERY: 'a enregistré une livraison tontine',
  CREDIT_SALES: 'a réalisé une vente crédit',
  NEW_CLIENT: 'a ajouté un nouveau client',
  TONTINE_MEMBER_ENROLLMENT: 'a inscrit un membre tontine',
  CREDIT: 'a créé un crédit',
  TONTINE: 'a créé une vente tontine',
  CASH: 'a réalisé une vente cash'
};

export function formatFcfa(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount ?? 0);
}

export function formatOperationMessage(log: DailyOperationLog, includeUsername = true): string {
  if (log.description?.trim()) {
    return log.description.trim();
  }

  const username = log.commercialUsername || 'Un utilisateur';
  const action = TYPE_LABELS[log.type] ?? `a effectué une opération (${log.type})`;
  const subject = log.reference?.trim() ? ` pour ${log.reference}` : '';
  const amountPart = log.amount && log.amount !== 0
    ? ` de ${formatFcfa(Math.abs(log.amount))} FCFA`
    : '';

  if (includeUsername) {
    return `${username} ${action}${amountPart}${subject}`;
  }
  return `${action.charAt(0).toUpperCase()}${action.slice(1)}${amountPart}${subject}`;
}

export function getOperationIcon(type: string): string {
  const icons: Record<string, string> = {
    CREDIT_COLLECTION: 'payments',
    CREDIT_COLLECTION_CANCEL: 'money_off',
    TONTINE_COLLECTION: 'savings',
    NEW_CLIENT: 'person_add',
    CREDIT_SALES: 'shopping_cart',
    CREDIT: 'credit_card',
    CASH: 'attach_money',
    STOCK_REQUEST: 'inventory_2',
    STOCK_RETURN: 'assignment_return',
    CASH_DEPOSIT: 'account_balance'
  };
  return icons[type] ?? 'history';
}
