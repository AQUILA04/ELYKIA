import { TestBed } from '@angular/core/testing';
import { PhotoSyncService } from './photo-sync.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IonicStorageModule } from '@ionic/storage-angular';

describe('PhotoSyncService', () => {
  let service: PhotoSyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, IonicStorageModule.forRoot()],
      providers: [PhotoSyncService]
    });
    service = TestBed.inject(PhotoSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have default preferences disabled', async () => {
    const preferences = await service.getPhotoSyncPreferences();
    expect(preferences.enableProfilePhotoSync).toBeFalse();
    expect(preferences.enableCardPhotoSync).toBeFalse();
  });
});