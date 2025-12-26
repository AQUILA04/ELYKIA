import { ClientView } from './client-view.model';
import { Client } from './client.model';
import { SafeUrl } from '@angular/platform-browser';

describe('ClientView Model', () => {
  it('should extend Client without type conflicts', () => {
    const mockClient: Client = {
      id: '1',
      firstname: 'John',
      lastname: 'Doe',
      phone: '90123456',
      address: 'Test Address',
      dateOfBirth: '1990-01-01',
      occupation: 'Developer',
      clientType: 'INDIVIDUAL',
      cardType: 'CNI',
      cardID: '123456789',
      quarter: 'Test Quarter',
      commercial: 'COM001',
      profilPhotoUrl: 'client_photos/profile_123.png',
      cardPhotoUrl: 'card_photos/card_123.png',
      updatedPhotoUrl: false
    };

    const mockSafeUrl = 'data:image/png;base64,test' as SafeUrl;

    const clientView: ClientView = {
      ...mockClient,
      photoUrl: mockSafeUrl,
      cardPhotoSafeUrl: mockSafeUrl
    };

    // Vérifier que ClientView hérite correctement de Client
    expect(clientView.id).toBe('1');
    expect(clientView.firstname).toBe('John');
    expect(clientView.profilPhotoUrl).toBe('client_photos/profile_123.png');
    expect(clientView.cardPhotoUrl).toBe('card_photos/card_123.png');
    
    // Vérifier les nouvelles propriétés SafeUrl
    expect(clientView.photoUrl).toBe(mockSafeUrl);
    expect(clientView.cardPhotoSafeUrl).toBe(mockSafeUrl);
  });

  it('should allow undefined values for optional properties', () => {
    const minimalClient: Client = {
      id: '1',
      firstname: 'John',
      lastname: 'Doe',
      phone: '90123456',
      address: 'Test Address',
      dateOfBirth: '1990-01-01',
      occupation: 'Developer',
      clientType: 'INDIVIDUAL',
      cardType: 'CNI',
      cardID: '123456789',
      quarter: 'Test Quarter',
      commercial: 'COM001'
    };

    const clientView: ClientView = {
      ...minimalClient
      // photoUrl et cardPhotoSafeUrl sont optionnels
    };

    expect(clientView.photoUrl).toBeUndefined();
    expect(clientView.cardPhotoSafeUrl).toBeUndefined();
    expect(clientView.profilPhotoUrl).toBeUndefined();
    expect(clientView.cardPhotoUrl).toBeUndefined();
  });
});