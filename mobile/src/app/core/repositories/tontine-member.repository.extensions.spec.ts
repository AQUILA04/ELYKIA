import { TontineMemberRepositoryExtensions } from './tontine-member.repository.extensions';

describe('TontineMemberRepositoryExtensions — filtres livrés', () => {
  let query: jasmine.Spy;
  let ext: TontineMemberRepositoryExtensions;

  beforeEach(() => {
    query = jasmine.createSpy('query').and.resolveTo({ values: [{ total: 0 }] });
    const repo: any = { getDatabaseService: () => ({ query }) };
    ext = new TontineMemberRepositoryExtensions(repo);
  });

  function dataSql(): string {
    const call = query.calls.allArgs().find(a => String(a[0]).includes('c.fullName as clientName'));
    return String(call![0]);
  }

  it('« Tous » exclut les membres livrés et trie par nom', async () => {
    await ext.findBySessionAndCommercialPaginated('s1', 'COM1', 0, 20, { excludeDelivered: true });

    const sql = dataSql();
    expect(sql).toContain("NOT (");
    expect(sql).toContain("'DELIVERED'");
    expect(sql).toContain('ORDER BY c.fullName ASC');
  });

  it('« Livrés » ne garde que les livrés, dernier livré en premier', async () => {
    await ext.findBySessionAndCommercialPaginated('s1', 'COM1', 0, 20, { deliveryStatus: 'DELIVERED' });

    const sql = dataSql();
    expect(sql).not.toContain('NOT (');
    expect(sql).toMatch(/ORDER BY \(\s*SELECT MAX\(/);
    expect(sql).toContain('DESC, c.fullName ASC');
  });

  it('expose les chemins photo du client pour l\'avatar', async () => {
    await ext.findBySessionAndCommercialPaginated('s1', 'COM1', 0, 20, {});

    const sql = dataSql();
    expect(sql).toContain('c.profilPhoto as clientProfilPhoto');
    expect(sql).toContain('c.profilPhotoThumbUrl as clientProfilPhotoThumbUrl');
    expect(sql).toContain('c.profilPhotoUrl as clientProfilPhotoUrl');
  });

  it('les autres statuts de livraison restent filtrés par égalité', async () => {
    await ext.findBySessionAndCommercialPaginated('s1', 'COM1', 0, 20, { deliveryStatus: 'PENDING' });

    expect(dataSql()).toContain('tm.deliveryStatus = ?');
  });
});
