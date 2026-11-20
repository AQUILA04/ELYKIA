import { of, throwError } from 'rxjs';
import { TontineService } from './tontine.service';

describe('TontineService.refreshSessionFromServerIfOnline', () => {
  function create(options: { hybridEnabled?: boolean; reachable?: boolean }) {
    const hybridSyncPreference = {
      isHybridSyncEnabled: jasmine.createSpy('isHybridSyncEnabled').and.resolveTo(options.hybridEnabled ?? true)
    };
    const connectivityService = {
      checkBackendReachable: jasmine.createSpy('checkBackendReachable').and.resolveTo(options.reachable ?? true)
    };
    const log = { log: jasmine.createSpy('log') };
    const store = { select: () => of(null), dispatch: jasmine.createSpy('dispatch') };

    const service = new TontineService(
      {} as any,
      {} as any,
      log as any,
      store as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      connectivityService as any,
      hybridSyncPreference as any
    );
    const fetchSpy = spyOn(service, 'fetchAndSaveSession').and.returnValue(of({ id: 's1', status: 'CLOSED' }));
    return { service, fetchSpy, connectivityService, log };
  }

  it('ne relit pas le serveur quand le mode hybride est désactivé', async () => {
    const { service, fetchSpy, connectivityService } = create({ hybridEnabled: false });

    const refreshed = await service.refreshSessionFromServerIfOnline();

    expect(refreshed).toBeFalse();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(connectivityService.checkBackendReachable).not.toHaveBeenCalled();
  });

  it('garde la session locale hors ligne', async () => {
    const { service, fetchSpy } = create({ reachable: false });

    const refreshed = await service.refreshSessionFromServerIfOnline();

    expect(refreshed).toBeFalse();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('relit la session du serveur quand le mode hybride est actif et le backend répond', async () => {
    const { service, fetchSpy } = create({ hybridEnabled: true, reachable: true });

    const refreshed = await service.refreshSessionFromServerIfOnline();

    expect(refreshed).toBeTrue();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('ne lève pas d\'erreur et garde la session locale si le rafraîchissement échoue', async () => {
    const { service, fetchSpy, log } = create({ hybridEnabled: true, reachable: true });
    fetchSpy.and.returnValue(throwError(() => new Error('boom')));

    const refreshed = await service.refreshSessionFromServerIfOnline();

    expect(refreshed).toBeFalse();
    expect(log.log).toHaveBeenCalled();
  });
});
