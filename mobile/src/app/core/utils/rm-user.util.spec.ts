import {
  hasRecoveryManagerProfil,
  canAccessRecoveryManagerMobile,
  isRmSharedRoute,
} from './rm-user.util';
import { User } from '../../models/auth.model';

describe('rm-user.util', () => {
  const rmUser: User = {
    id: '1',
    username: 'rm.user',
    email: 'rm@test.com',
    roles: ['ROLE_RECOVERY_MANAGER'],
    accessToken: 'a',
    refreshToken: 'r',
  };

  it('detects recovery manager by profil', () => {
    expect(hasRecoveryManagerProfil({ ...rmUser, profil: 'RECOVERY_MANAGER' })).toBe(true);
  });

  it('detects recovery manager by role when profil is missing', () => {
    expect(hasRecoveryManagerProfil(rmUser)).toBe(true);
  });

  it('rejects commercial user', () => {
    expect(hasRecoveryManagerProfil({ ...rmUser, profil: 'PROMOTER', roles: ['ROLE_PROMOTER'] })).toBe(false);
  });

  it('canAccessRecoveryManagerMobile follows profil/role regardless of remote config', () => {
    expect(canAccessRecoveryManagerMobile({ ...rmUser, profil: 'RECOVERY_MANAGER' })).toBe(true);
    expect(canAccessRecoveryManagerMobile({ ...rmUser, profil: 'PROMOTER', roles: ['ROLE_PROMOTER'] })).toBe(false);
  });

  it('allows sync-errors shared routes for RM shell', () => {
    expect(isRmSharedRoute('/sync-errors')).toBe(true);
    expect(isRmSharedRoute('/sync-errors/abc-123')).toBe(true);
    expect(isRmSharedRoute('/sync-errors?focus=1')).toBe(true);
    expect(isRmSharedRoute('/rm/more')).toBe(false);
    expect(isRmSharedRoute('/tabs/dashboard')).toBe(false);
    expect(isRmSharedRoute('/sync/manual')).toBe(false);
  });
});
