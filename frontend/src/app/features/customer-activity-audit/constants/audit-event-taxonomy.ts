export type AuditCategory = 'AUTH' | 'NAVIGATION' | 'BUSINESS' | 'ERROR';
export type AuditSource = 'CLIENT_APP' | 'SERVER';
export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'INFO';

export interface AuditEventOption {
  value: string;
  label: string;
  category: AuditCategory;
}

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  AUTH: 'Authentification',
  NAVIGATION: 'Navigation',
  BUSINESS: 'Métier',
  ERROR: 'Erreur',
};

export const AUDIT_SOURCE_LABELS: Record<AuditSource, string> = {
  CLIENT_APP: 'Client',
  SERVER: 'Serveur',
};

export const AUDIT_EVENT_OPTIONS: AuditEventOption[] = [
  { value: 'APP_OPEN', label: 'Ouverture de l’app', category: 'AUTH' },
  { value: 'PHONE_SUBMITTED', label: 'Téléphone saisi', category: 'AUTH' },
  { value: 'CUSTOMER_SPACE_UNAVAILABLE', label: 'Espace client indisponible', category: 'AUTH' },
  { value: 'PIN_LOGIN_ATTEMPT', label: 'Tentative PIN', category: 'AUTH' },
  { value: 'LOGIN_SUCCESS', label: 'Connexion réussie', category: 'AUTH' },
  { value: 'LOGIN_FAILED', label: 'Échec de connexion', category: 'AUTH' },
  { value: 'OTP_SEND_REQUESTED', label: 'Demande d’envoi OTP', category: 'AUTH' },
  { value: 'OTP_SENT', label: 'OTP envoyé', category: 'AUTH' },
  { value: 'OTP_SEND_FAILED', label: 'Échec envoi OTP', category: 'AUTH' },
  { value: 'OTP_VERIFY_ATTEMPT', label: 'Vérification OTP', category: 'AUTH' },
  { value: 'OTP_VERIFIED', label: 'OTP validé', category: 'AUTH' },
  { value: 'OTP_FAILED', label: 'Échec OTP', category: 'AUTH' },
  { value: 'PIN_SETUP', label: 'Création du PIN', category: 'AUTH' },
  { value: 'REGISTER_SUBMITTED', label: 'Inscription envoyée', category: 'AUTH' },
  { value: 'REGISTER', label: 'Inscription enregistrée', category: 'AUTH' },
  { value: 'CHECK_PHONE', label: 'Vérification téléphone', category: 'AUTH' },
  { value: 'SESSION_EXPIRED', label: 'Session expirée', category: 'AUTH' },
  { value: 'LOGOUT', label: 'Déconnexion', category: 'AUTH' },
  { value: 'SCREEN_VIEW', label: 'Écran consulté', category: 'NAVIGATION' },
  { value: 'ONBOARDING_DOC_UPLOADED', label: 'Document onboarding', category: 'BUSINESS' },
  { value: 'INITIAL_DEPOSIT_SUBMITTED', label: 'Dépôt initial soumis', category: 'BUSINESS' },
  { value: 'MM_PAYMENT_SUBMITTED', label: 'Paiement MM soumis', category: 'BUSINESS' },
  { value: 'MM_PAYMENT_FAILED', label: 'Échec paiement MM', category: 'BUSINESS' },
  { value: 'TONTINE_JOIN', label: 'Adhésion tontine', category: 'BUSINESS' },
  { value: 'TONTINE_PAYMENT_SUBMITTED', label: 'Cotisation tontine', category: 'BUSINESS' },
  { value: 'CART_ADD', label: 'Ajout panier', category: 'BUSINESS' },
  { value: 'CART_REMOVE', label: 'Retrait panier', category: 'BUSINESS' },
  { value: 'ORDER_SUBMITTED', label: 'Commande soumise', category: 'BUSINESS' },
  { value: 'ORDER_FAILED', label: 'Échec commande', category: 'BUSINESS' },
  { value: 'APP_UPDATE_CHECK', label: 'Vérification mise à jour', category: 'BUSINESS' },
  { value: 'APP_UPDATE_DOWNLOAD', label: 'Téléchargement mise à jour', category: 'BUSINESS' },
  { value: 'APP_ERROR', label: 'Erreur application', category: 'ERROR' },
  { value: 'UNHANDLED_REJECTION', label: 'Promesse rejetée', category: 'ERROR' },
  { value: 'HTTP_ERROR', label: 'Erreur HTTP', category: 'ERROR' },
];

export function auditEventLabel(eventType: string | null | undefined): string {
  if (!eventType) {
    return '—';
  }
  return AUDIT_EVENT_OPTIONS.find((o) => o.value === eventType)?.label ?? eventType;
}

export function isFailureEvent(eventType: string | null | undefined, category: string | null | undefined): boolean {
  if (category === 'ERROR') {
    return true;
  }
  if (!eventType) {
    return false;
  }
  return /FAILED|ERROR|EXPIRED/.test(eventType);
}
