import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { LoginPage } from './login.page';
import { FilesystemPermissionService } from 'src/app/core/services/filesystem-permission.service';
import { AlertController, IonInput, LoadingController, ModalController, ToastController } from '@ionic/angular';
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
    let filesystemPermissionService: MockedObject<FilesystemPermissionService>;
    let authService: MockedObject<AuthService>;
    let alertController: MockedObject<AlertController>;

    beforeEach(async () => {
        filesystemPermissionService = {
            ensurePublicStorageAccess: vi.fn().mockName("FilesystemPermissionService.ensurePublicStorageAccess")
        } as unknown as MockedObject<FilesystemPermissionService>;
        filesystemPermissionService.ensurePublicStorageAccess.mockResolvedValue({ granted: true, deniedAfterRequest: false });
        authService = {
            consumeSessionExpiredNotice: vi.fn().mockName("AuthService.consumeSessionExpiredNotice")
        } as unknown as MockedObject<AuthService>;
        authService.consumeSessionExpiredNotice.mockReturnValue(false);
        alertController = {
            create: vi.fn().mockName("AlertController.create")
        } as unknown as MockedObject<AlertController>;

        await TestBed.configureTestingModule({
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            declarations: [LoginPage],
            imports: [FormsModule, IonInput],
            providers: [
                provideMockStore(),
                provideMockActions(() => new Subject()),
                { provide: FilesystemPermissionService, useValue: filesystemPermissionService },
                { provide: AuthService, useValue: authService },
                { provide: AlertController, useValue: alertController },
                { provide: LoadingController, useValue: {
                        create: vi.fn().mockName("LoadingController.create")
                    } },
                { provide: ModalController, useValue: {
                        create: vi.fn().mockName("ModalController.create")
                    } },
                { provide: ToastController, useValue: {
                        create: vi.fn().mockName("ToastController.create")
                    } },
                { provide: LoggerService, useValue: {
                        readLogs: vi.fn().mockName("LoggerService.readLogs"),
                        clearLogFile: vi.fn().mockName("LoggerService.clearLogFile"),
                        clearLogs: vi.fn().mockName("LoggerService.clearLogs")
                    } },
                { provide: DataInitializationService, useValue: {
                        restoreFromBackup: vi.fn().mockName("DataInitializationService.restoreFromBackup")
                    } },
                { provide: DatabaseService, useValue: {
                        findAllBackupFiles: vi.fn().mockName("DatabaseService.findAllBackupFiles"),
                        restoreFromManualSelection: vi.fn().mockName("DatabaseService.restoreFromManualSelection"),
                        testCrossInstallationFileAccess: vi.fn().mockName("DatabaseService.testCrossInstallationFileAccess")
                    } },
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
        authService.consumeSessionExpiredNotice.mockReturnValue(true);
        const alert = { present: vi.fn().mockResolvedValue(undefined) };
        alertController.create.mockResolvedValue(alert as never);

        await component.ionViewWillEnter();

        expect(alertController.create).toHaveBeenCalledWith(expect.objectContaining({
            header: 'Session expirée',
            message: 'Votre session n\'est plus valide. Reconnectez-vous pour continuer.',
        }));
        expect(alert.present).toHaveBeenCalled();
    });
});
