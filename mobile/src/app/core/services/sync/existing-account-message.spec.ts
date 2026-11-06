import { isExistingAccountMessage } from './existing-account-message';

describe('isExistingAccountMessage', () => {
  it('recognises the backend notice that names the client', () => {
    expect(isExistingAccountMessage('Le client Jean Dupont a déjà un compte (n° 0021190079).')).toBeTrue();
  });

  it('ignores a generic success message', () => {
    expect(isExistingAccountMessage('default.message.success')).toBeFalse();
    expect(isExistingAccountMessage(null)).toBeFalse();
  });
});
