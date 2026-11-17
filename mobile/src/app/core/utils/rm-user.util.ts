import { RECOVERY_MANAGER_PROFIL, User } from '../../models/auth.model';

export function hasRecoveryManagerProfil(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }
  if (user.profil === RECOVERY_MANAGER_PROFIL) {
    return true;
  }
  return (user.roles ?? []).some(
    role => role === 'ROLE_RECOVERY_MANAGER' || role === RECOVERY_MANAGER_PROFIL
  );
}

/** RM mobile shell access — driven by profil/role, not Remote Config (flag is informational only). */
export function canAccessRecoveryManagerMobile(user: User | null | undefined): boolean {
  return hasRecoveryManagerProfil(user);
}

/**
 * Shared routes outside `/rm/*` that a recovery manager may open
 * (e.g. sync error list linked from Plus / Terrain).
 */
export function isRmSharedRoute(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }
  const path = url.split('?')[0];
  return path === '/sync-errors' || path.startsWith('/sync-errors/');
}
