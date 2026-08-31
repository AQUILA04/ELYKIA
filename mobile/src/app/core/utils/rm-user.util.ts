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
