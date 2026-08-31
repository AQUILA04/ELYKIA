import { RECOVERY_MANAGER_PROFIL, User } from '../../models/auth.model';
import { FeatureFlagService, FeatureFlags } from '../services/feature-flag.service';

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

export function canAccessRecoveryManagerMobile(
  user: User | null | undefined,
  featureFlags: FeatureFlagService
): boolean {
  return hasRecoveryManagerProfil(user) && featureFlags.isFeatureEnabled(FeatureFlags.RecoveryManagerMobile);
}
