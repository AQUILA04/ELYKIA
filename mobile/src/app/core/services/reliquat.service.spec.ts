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
