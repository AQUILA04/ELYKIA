import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { LoginPage } from './login.page';
import { FilesystemPermissionService } from 'src/app/core/services/filesystem-permission.service';
import { IonicModule, AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import { LoggerService } from 'src/app/core/services/logger.service';
import { DataInitializationService } from 'src/app/core/services/data-initialization.service';
import { DatabaseService } from 'src/app/core/services/database.service';
import { AuthService } from 'src/app/core/services/auth.service';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let filesystemPermissionService: jasmine.SpyObj<FilesystemPermissionService>;
  let authService: jasmine.SpyObj<AuthService>;
  let alertController: jasmine.SpyObj<AlertController>;

  beforeEach(async () => {
    filesystemPermissionService = jasmine.createSpyObj('FilesystemPermissionService', ['ensurePublicStorageAccess']);
    filesystemPermissionService.ensurePublicStorageAccess.and.resolveTo({ granted: true, deniedAfterRequest: false });
    authService = jasmine.createSpyObj('AuthService', ['consumeSessionExpiredNotice']);
    authService.consumeSessionExpiredNotice.and.returnValue(false);
    alertController = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      declarations: [LoginPage],
      imports: [IonicModule.forRoot(), FormsModule],
      providers: [
        provideMockStore(),
        provideMockActions(() => new Subject()),
        { provide: FilesystemPermissionService, useValue: filesystemPermissionService },
        { provide: AuthService, useValue: authService },
        { provide: AlertController, useValue: alertController },
        { provide: LoadingController, useValue: jasmine.createSpyObj('LoadingController', ['create']) },
        { provide: ModalController, useValue: jasmine.createSpyObj('ModalController', ['create']) },
        { provide: ToastController, useValue: jasmine.createSpyObj('ToastController', ['create']) },
        { provide: LoggerService, useValue: jasmine.createSpyObj('LoggerService', ['readLogs', 'clearLogFile', 'clearLogs']) },
        { provide: DataInitializationService, useValue: jasmine.createSpyObj('DataInitializationService', ['restoreFromBackup']) },
        { provide: DatabaseService, useValue: jasmine.createSpyObj('DatabaseService', ['findAllBackupFiles', 'restoreFromManualSelection', 'testCrossInstallationFileAccess']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request filesystem permission on view enter', async () => {
    await component.ionViewWillEnter();
    expect(filesystemPermissionService.ensurePublicStorageAccess).toHaveBeenCalled();
  });

  it('should explain that the session expired', async () => {
    authService.consumeSessionExpiredNotice.and.returnValue(true);
    const alert = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(alert as never);

    await component.ionViewWillEnter();

    expect(alertController.create).toHaveBeenCalledWith(jasmine.objectContaining({
      header: 'Session expirée',
      message: 'Votre session n\'est plus valide. Reconnectez-vous pour continuer.',
    }));
    expect(alert.present).toHaveBeenCalled();
  });
});
