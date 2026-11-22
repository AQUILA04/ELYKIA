import { HttpErrorResponse } from '@angular/common/http';
import {
  DEFAULT_USER_ERROR_MESSAGE,
  NETWORK_USER_ERROR_MESSAGE,
  isNetworkError,
  toUserErrorMessage
} from './user-error-message.util';

describe('toUserErrorMessage', () => {
  const url = 'https://elykia-test.amenouveve-yaveh.com/api/api/v1/tontines/deliveries/5/items';

  it('returns the backend Response.message of a 400, never the Angular text', () => {
    const error = new HttpErrorResponse({
      status: 400, statusText: 'OK', url,
      error: { status: 'BAD_REQUEST', message: 'La commande (62 300 FCFA) dépasse le plafond de ce membre (25 500 FCFA) de 36 800 FCFA.' }
    });

    expect(error.message).toContain('Http failure response');
    expect(toUserErrorMessage(error)).toBe('La commande (62 300 FCFA) dépasse le plafond de ce membre (25 500 FCFA) de 36 800 FCFA.');
  });

  it('reads a JSON body received as text', () => {
    const error = new HttpErrorResponse({ status: 409, url, error: JSON.stringify({ message: 'Déjà livré.' }) });
    expect(toUserErrorMessage(error)).toBe('Déjà livré.');
  });

  it('falls back to a French message by status when the body has no message', () => {
    expect(toUserErrorMessage(new HttpErrorResponse({ status: 500, url, error: '<html>oops</html>' })))
      .toContain('Le serveur a rencontré une erreur');
    expect(toUserErrorMessage(new HttpErrorResponse({ status: 418, url, error: null }), 'Commande non modifiée.'))
      .toBe('Commande non modifiée.');
  });

  it('explains a network failure (status 0) in plain words', () => {
    const error = new HttpErrorResponse({ status: 0, url, error: new ProgressEvent('error') });
    expect(toUserErrorMessage(error)).toBe(NETWORK_USER_ERROR_MESSAGE);
    expect(isNetworkError(error)).toBeTrue();
  });

  it('keeps a business Error message and hides technical ones', () => {
    expect(toUserErrorMessage(new Error('Synchronisez la commande avant de la modifier.')))
      .toBe('Synchronisez la commande avant de la modifier.');
    expect(toUserErrorMessage(new Error(`Http failure response for ${url}: 400 OK`))).toBe(DEFAULT_USER_ERROR_MESSAGE);
    expect(toUserErrorMessage(new TypeError('Cannot read properties of undefined'))).toBe(DEFAULT_USER_ERROR_MESSAGE);
    expect(toUserErrorMessage(null, 'x')).toBe('x');
  });
});
