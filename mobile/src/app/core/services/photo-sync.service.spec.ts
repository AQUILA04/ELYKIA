import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { PhotoSyncService } from './photo-sync.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Storage } from '@ionic/storage-angular';

describe('PhotoSyncService', () => {
    let service: PhotoSyncService;

    beforeEach(() => {
        const storageMock = {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(undefined),
        };
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                { provide: Storage, useValue: storageMock },
                PhotoSyncService,
            ],
        });
        service = TestBed.inject(PhotoSyncService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should have default preferences enabled', async () => {
        const preferences = await service.getPhotoSyncPreferences();
        expect(preferences.enableProfilePhotoSync).toBe(true);
        expect(preferences.enableCardPhotoSync).toBe(true);
    });
});
