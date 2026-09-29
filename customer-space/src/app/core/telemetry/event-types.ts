/** Taxonomie des événements journalisés (Espace Client). */

export type JournalCategory = 'AUTH' | 'NAVIGATION' | 'BUSINESS' | 'ERROR';

export type JournalEventType =
  | 'APP_OPEN'
  | 'PHONE_SUBMITTED'
  | 'CUSTOMER_SPACE_UNAVAILABLE'
  | 'PIN_LOGIN_ATTEMPT'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'OTP_SEND_REQUESTED'
  | 'OTP_SENT'
  | 'OTP_VERIFY_ATTEMPT'
  | 'OTP_VERIFIED'
  | 'OTP_FAILED'
  | 'PIN_SETUP'
  | 'REGISTER_SUBMITTED'
  | 'SESSION_EXPIRED'
  | 'LOGOUT'
  | 'SCREEN_VIEW'
  | 'ONBOARDING_DOC_UPLOADED'
  | 'INITIAL_DEPOSIT_SUBMITTED'
  | 'MM_PAYMENT_SUBMITTED'
  | 'MM_PAYMENT_FAILED'
  | 'TONTINE_JOIN'
  | 'TONTINE_PAYMENT_SUBMITTED'
  | 'CART_ADD'
  | 'CART_REMOVE'
  | 'ORDER_SUBMITTED'
  | 'ORDER_FAILED'
  | 'APP_UPDATE_CHECK'
  | 'APP_UPDATE_DOWNLOAD'
  | 'APP_ERROR'
  | 'UNHANDLED_REJECTION'
  | 'HTTP_ERROR';

export interface JournalEventProps {
  [key: string]: string | number | boolean | null | undefined;
}

export interface JournalQueuedEvent {
  eventId: string;
  occurredAt: string;
  category: JournalCategory;
  eventType: JournalEventType;
  deviceId: string;
  sessionId: string;
  clientId?: string | null;
  phone?: string | null;
  platform: string;
  appVersion: string;
  screen?: string | null;
  httpStatus?: number | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}
