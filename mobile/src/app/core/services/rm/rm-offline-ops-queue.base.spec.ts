import { RmOfflineOpBase, RmOfflineOpsQueueStore } from './rm-offline-ops-queue.base';
import { RmLocalStore } from './rm-local-store.service';

interface TestOp extends RmOfflineOpBase {
  reference: string;
}

function makeStore(initial: TestOp[]) {
  let saved: TestOp[] = initial;
  const store = {
    watchRestore: () => undefined,
    loadOps: jasmine.createSpy('loadOps').and.callFake(async () => saved),
    saveOps: jasmine.createSpy('saveOps').and.callFake(async (_key: string, ops: TestOp[]) => { saved = ops; }),
  };
  return { store: store as unknown as RmLocalStore, spies: store, read: () => saved };
}

describe('RmOfflineOpsQueueStore.clearAll', () => {
  const op = (localId: string, isSync: boolean): TestOp => ({ localId, reference: localId, isSync });
  const build = (store: RmLocalStore) =>
    new RmOfflineOpsQueueStore<TestOp>(store, 'rm_test', (x, y) => x.reference === y.reference);

  it('never removes operations that are not synchronized yet', async () => {
    const { store, read } = makeStore([op('a', false), op('b', true), op('c', false)]);
    const queue = build(store);

    await queue.clearAll();

    expect(read().map(o => o.localId)).toEqual(['a', 'c']);
    expect(queue.pendingCount()).toBe(2);
  });

  it('removes only synchronized operations when everything is sent', async () => {
    const { store, read } = makeStore([op('a', true), op('b', true)]);

    await build(store).clearAll();

    expect(read()).toEqual([]);
  });

  it('does not rewrite SQLite when there is nothing to remove', async () => {
    const { store, spies } = makeStore([op('a', false)]);

    await build(store).clearAll();

    expect(spies.saveOps).not.toHaveBeenCalled();
  });
});
