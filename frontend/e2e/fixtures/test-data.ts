/**
 * Identifiants des comptes de test.
 *
 * mag001 :
 * - Environnement vierge (init `application.yml`) → `Maga1234`
 * - Bases locales déjà peuplées (mot de passe modifié) → `Abcd1234` en repli
 * - Surcharge explicite → `E2E_MAG001_PASSWORD`
 */
export const USER_ACCOUNTS = {
  gestionnaire: {
    username: process.env['E2E_GES003_USERNAME'] ?? 'ges003',
    passwordCandidates: uniqueStrings([
      process.env['E2E_GES003_PASSWORD'],
      'Abcd1234',
    ]),
    label: 'GESTIONNAIRE',
  },
  magasinier: {
    username: process.env['E2E_MAG001_USERNAME'] ?? 'mag001',
    passwordCandidates: uniqueStrings([
      process.env['E2E_MAG001_PASSWORD'],
      'Maga1234',
      'Abcd1234',
    ]),
    label: 'STOREKEEPER',
  },
  commercial: {
    username: process.env['E2E_COMMERCIAL_USERNAME'] ?? 'COM020',
    passwordCandidates: uniqueStrings([
      process.env['E2E_COMMERCIAL_PASSWORD'],
      'ChangeMe020',
      'Abcd1234',
    ]),
    label: 'PROMOTER',
  },
} as const;

/** Commercial utilisé dans les scénarios métier (ventes, stock, clients). */
export const TEST_COMMERCIAL_USERNAME = USER_ACCOUNTS.commercial.username;

/**
 * Commercial agence (paramètre `AGENCY_COLLECTOR`) — les ventes comptant lui sont attribuées,
 * pas au commercial terrain du client.
 */
export const TEST_AGENCY_COMMERCIAL_USERNAME =
  process.env['E2E_AGENCY_COMMERCIAL_USERNAME'] ?? 'COM001';

export type E2eUserKey = keyof typeof USER_ACCOUNTS;

export interface ResolvedCredentials {
  username: string;
  password: string;
}

const resolvedPasswordCache = new Map<E2eUserKey, ResolvedCredentials>();

export const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:8081';

/** Préfixe pour les données créées par les tests E2E (nettoyage futur). */
export const E2E_PREFIX = 'E2E_';

export function uniqueE2eLabel(suffix: string): string {
  return `${E2E_PREFIX}${suffix}_${Date.now()}`;
}

/** Numéro de téléphone unique (8 chiffres) pour éviter les doublons clients. */
export function uniqueE2ePhone(): string {
  const suffix = (Date.now() % 100_000_000).toString().padStart(8, '0');
  return suffix;
}

/** Quantité utilisée pour les demandes de sortie stock E2E. */
export const E2E_STOCK_REQUEST_QTY = 2;

/** Quantité vendue à crédit dans le golden path (phase 3). */
export const E2E_CREDIT_SALE_QTY = 1;

/** Quantité distribuée via rattrapage crédit (stock mois précédent). */
export const E2E_RATTRAPAGE_QTY = 1;

/** Mise journalière rattrapage E2E (min. backend = montant total article, souvent 200 FCFA). */
export const E2E_RATTRAPAGE_DAILY_STAKE = 200;

/** Stock résiduel du mois précédent à préparer pour le rattrapage E2E. */
export const E2E_RESIDUAL_STOCK_QTY = 2;

/** Quantité retournée au magasin (phase 4). */
export const E2E_STOCK_RETURN_QTY = 1;

/** Quantité vendue comptant (phase 4). */
export const E2E_CASH_SALE_QTY = 1;

/** Montant collecte tontine E2E (min. 100 FCFA) — suffisant pour une livraison article. */
export const E2E_TONTINE_COLLECTION_AMOUNT = 50_000;

/** Montant souhaité membre tontine E2E (obligatoire côté historique montants). */
export const E2E_TONTINE_MEMBER_AMOUNT = 5_000;

/** Quantité demande stock tontine E2E. */
export const E2E_STOCK_TONTINE_REQUEST_QTY = 1;

/** Date du jour au format ISO (yyyy-MM-dd) pour les filtres API. */
export function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0]!;
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => !!value))];
}

async function trySignIn(username: string, password: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      return false;
    }
    const body = await response.json();
    return !!(body.accessToken ?? body.token ?? body.data?.token);
  } catch {
    return false;
  }
}

/**
 * Résout le mot de passe effectif en testant chaque candidat sur l'API.
 * Résultat mis en cache pour la durée du processus de test.
 */
export async function resolveCredentials(userKey: E2eUserKey): Promise<ResolvedCredentials> {
  const cached = resolvedPasswordCache.get(userKey);
  if (cached) {
    return cached;
  }

  const account = USER_ACCOUNTS[userKey];

  for (const password of account.passwordCandidates) {
    const ok = await trySignIn(account.username, password);
    if (ok) {
      const resolved = { username: account.username, password };
      resolvedPasswordCache.set(userKey, resolved);
      return resolved;
    }
  }

  throw new Error(
    `Aucun mot de passe valide pour ${account.username} sur ${API_URL}. ` +
      `Candidats testés : ${account.passwordCandidates.join(', ')}`,
  );
}

/** @deprecated Utiliser resolveCredentials — conservé pour les assertions simples */
export const USERS = {
  gestionnaire: {
    username: USER_ACCOUNTS.gestionnaire.username,
    password: USER_ACCOUNTS.gestionnaire.passwordCandidates[0]!,
    label: USER_ACCOUNTS.gestionnaire.label,
  },
  magasinier: {
    username: USER_ACCOUNTS.magasinier.username,
    password: USER_ACCOUNTS.magasinier.passwordCandidates[0]!,
    label: USER_ACCOUNTS.magasinier.label,
  },
  commercial: {
    username: USER_ACCOUNTS.commercial.username,
    password: USER_ACCOUNTS.commercial.passwordCandidates[0]!,
    label: USER_ACCOUNTS.commercial.label,
  },
} as const;
