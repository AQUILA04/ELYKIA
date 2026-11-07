import { ReliquatService } from './reliquat.service';

/**
 * Tests unitaires purs de computeRecoveryPlan (pas de TestBed HTTP).
 * Cas critique : restant = reliquat, espèces = 0 → pas de faux nouveau reliquat.
 */
describe('ReliquatService.computeRecoveryPlan', () => {
  let service: ReliquatService;

  beforeEach(() => {
    service = Object.create(ReliquatService.prototype) as ReliquatService;
  });

  it('clôture exacte avec reliquat seul (200 restant, 200 reliquat, 0 cash)', () => {
    const plan = service.computeRecoveryPlan(200, 0, 200, true);
    expect(plan.amountCovered).toBe(200);
    expect(plan.reliquatUsed).toBe(200);
    expect(plan.cashNeeded).toBe(0);
    expect(plan.reliquatGenerated).toBe(0);
  });

  it('ne génère pas de reliquat quand received est à tort égal au montant couvert sans cash réel', () => {
    // Ancien bug : effectiveReceived = recoveryAmount quand received=0
    const buggyPlan = service.computeRecoveryPlan(200, 200, 200, true);
    // Si on passe received=200 (fallback erroné), un reliquat est généré — documenté ici.
    expect(buggyPlan.reliquatGenerated).toBe(200);
    // Le correctif côté RecoveryPage est de passer received=0 :
    const fixedPlan = service.computeRecoveryPlan(200, 0, 200, true);
    expect(fixedPlan.reliquatGenerated).toBe(0);
  });

  it('combine cash partiel + reliquat', () => {
    const plan = service.computeRecoveryPlan(225, 25, 200, true);
    expect(plan.reliquatUsed).toBe(200);
    expect(plan.cashNeeded).toBe(25);
    expect(plan.reliquatGenerated).toBe(0);
  });

  it('génère un reliquat seulement sur excédent d\'espèces', () => {
    const plan = service.computeRecoveryPlan(225, 300, 0, false);
    expect(plan.reliquatUsed).toBe(0);
    expect(plan.cashNeeded).toBe(225);
    expect(plan.reliquatGenerated).toBe(75);
  });

  it('ignore le reliquat si useReliquat=false', () => {
    const plan = service.computeRecoveryPlan(200, 0, 200, false);
    expect(plan.reliquatUsed).toBe(0);
    expect(plan.cashNeeded).toBe(200);
  });
});

describe('ReliquatService.persistReliquatsFromServer', () => {
  it('restaure un solde serveur et ne remplace pas une ligne locale non synchronisée', async () => {
    const upserts: Array<{ clientId: string; totalAmount: number; isSync: boolean }> = [];
    const service = Object.create(ReliquatService.prototype) as {
      persistReliquatsFromServer: (commercial: string, dtos: unknown[]) => Promise<boolean>;
      resolveLocalClientId: (id: string | number) => Promise<string | null>;
      generateUuid: () => string;
    };
    const findByClientId = jasmine.createSpy('findByClientId').and.callFake(async (clientId: string) => {
      if (clientId === 'local-pending') {
        return { clientId, isSync: false, totalAmount: 450 };
      }
      return null;
    });
    (service as unknown as { reliquatRepository: unknown; log: unknown }).reliquatRepository = {
      deleteSynced: jasmine.createSpy('deleteSynced').and.resolveTo(),
      findByClientId,
      upsert: jasmine.createSpy('upsert').and.callFake(async (row: { clientId: string; totalAmount: number; isSync: boolean }) => {
        upserts.push(row);
      })
    };
    (service as unknown as { log: { log: () => void } }).log = { log: () => undefined };
    service.resolveLocalClientId = async (id) => `local-${id}`;
    service.generateUuid = () => 'generated-id';

    const ok = await service.persistReliquatsFromServer('COM019', [
      { clientId: 'pending', totalAmount: 1 },
      { clientId: 'server', totalAmount: 800 }
    ]);

    expect(ok).toBeTrue();
    expect(upserts.length).toBe(1);
    expect(upserts[0].clientId).toBe('local-server');
    expect(upserts[0].totalAmount).toBe(800);
    expect(upserts[0].isSync).toBeTrue();
  });
});
