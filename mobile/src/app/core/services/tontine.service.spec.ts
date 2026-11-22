import { of, throwError } from 'rxjs';
import { TontineService } from './tontine.service';

describe('TontineService.refreshSessionFromServerIfOnline', () => {
    function create(options: {
        hybridEnabled?: boolean;
        reachable?: boolean;
    }) {
        const hybridSyncPreference = {
            isHybridSyncEnabled: vi.fn().mockResolvedValue(options.hybridEnabled ?? true)
        };
        const connectivityService = {
            checkBackendReachable: vi.fn().mockResolvedValue(options.reachable ?? true)
        };
        const log = { log: vi.fn() };
        const store = { select: () => of(null), dispatch: vi.fn() };

        const service = new TontineService({} as any, {} as any, log as any, store as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, connectivityService as any, hybridSyncPreference as any);
        const fetchSpy = vi.spyOn(service, 'fetchAndSaveSession').mockReturnValue(of({ id: 's1', status: 'CLOSED' }));
        return { service, fetchSpy, connectivityService, log };
    }

    it('ne relit pas le serveur quand le mode hybride est désactivé', async () => {
        const { service, fetchSpy, connectivityService } = create({ hybridEnabled: false });

        const refreshed = await service.refreshSessionFromServerIfOnline();

        expect(refreshed).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(connectivityService.checkBackendReachable).not.toHaveBeenCalled();
    });

    it('garde la session locale hors ligne', async () => {
        const { service, fetchSpy } = create({ reachable: false });

        const refreshed = await service.refreshSessionFromServerIfOnline();

        expect(refreshed).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('relit la session du serveur quand le mode hybride est actif et le backend répond', async () => {
        const { service, fetchSpy } = create({ hybridEnabled: true, reachable: true });

        const refreshed = await service.refreshSessionFromServerIfOnline();

        expect(refreshed).toBe(true);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('ne lève pas d\'erreur et garde la session locale si le rafraîchissement échoue', async () => {
        const { service, fetchSpy, log } = create({ hybridEnabled: true, reachable: true });
        fetchSpy.mockReturnValue(throwError(() => new Error('boom')));

        const refreshed = await service.refreshSessionFromServerIfOnline();

        expect(refreshed).toBe(false);
        expect(log.log).toHaveBeenCalled();
    });
});
