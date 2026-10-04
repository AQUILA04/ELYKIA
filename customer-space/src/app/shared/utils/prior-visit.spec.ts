import { capturePriorVisit, isReturningVisitor, PRIOR_VISIT_SNAPSHOT_KEY } from './prior-visit';

describe('prior-visit', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('treats an empty storage as a first visit', () => {
    capturePriorVisit();
    expect(isReturningVisitor()).toBeFalse();
    expect(sessionStorage.getItem(PRIOR_VISIT_SNAPSHOT_KEY)).toBe('0');
  });

  it('treats an existing app trace as a return visit', () => {
    localStorage.setItem('elykia_customer_device_id', 'abc');
    capturePriorVisit();
    expect(isReturningVisitor()).toBeTrue();
  });

  it('remembers the visit for the next opening', () => {
    capturePriorVisit();
    expect(isReturningVisitor()).toBeFalse();

    sessionStorage.clear();
    capturePriorVisit();
    expect(isReturningVisitor()).toBeTrue();
  });
});
