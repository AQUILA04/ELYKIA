import type { MockedObject } from "vitest";
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { UserDetailsComponent } from './user-details.component';
import { UserService } from '../service/user.service';
import { UserDeviceService } from '../service/user-device.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { PermissionService } from '../../security/services/permission.service';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';
import { ParameterService } from 'src/app/parameters/parameter.service';

describe('UserDetailsComponent', () => {
    let component: UserDetailsComponent;
    let fixture: ComponentFixture<UserDetailsComponent>;
    let featureFlagService: MockedObject<Pick<FeatureFlagService, 'isFeatureEnabled'>>;

    beforeEach(async () => {
        featureFlagService = {
            isFeatureEnabled: vi.fn().mockName("FeatureFlagService.isFeatureEnabled")
        };
        featureFlagService.isFeatureEnabled.mockReturnValue(false);

        const userService = {
            getUserById: vi.fn().mockName("UserService.getUserById")
        };
        userService.getUserById.mockReturnValue(of({ data: { id: 1, username: 'test', userPermissions: [] } }));
        const permissionService = {
            getAllList: vi.fn().mockName("PermissionService.getAllList")
        };
        permissionService.getAllList.mockReturnValue(of({ data: [] }));

        await TestBed.configureTestingModule({
            declarations: [UserDetailsComponent],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                { provide: UserService, useValue: userService },
                { provide: UserDeviceService, useValue: {
                        listDevices: vi.fn().mockName("UserDeviceService.listDevices")
                    } },
                { provide: AlertService, useValue: {
                        showError: vi.fn().mockName("AlertService.showError"),
                        showDefaultSucces: vi.fn().mockName("AlertService.showDefaultSucces"),
                        showConfirmation: vi.fn().mockName("AlertService.showConfirmation"),
                        showPrompt: vi.fn().mockName("AlertService.showPrompt")
                    } },
                { provide: TokenStorageService, useValue: {
                        checkConnectedUser: vi.fn().mockName("TokenStorageService.checkConnectedUser")
                    } },
                { provide: PermissionService, useValue: permissionService },
                { provide: FeatureFlagService, useValue: featureFlagService },
                { provide: ParameterService, useValue: {
                        getByKey: vi.fn().mockName("ParameterService.getByKey")
                    } },
                { provide: Router, useValue: {
                        navigate: vi.fn().mockName("Router.navigate")
                    } },
                {
                    provide: ActivatedRoute,
                    useValue: { params: of({ id: '1' }) },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(UserDetailsComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should hide mobile devices section when feature flag is disabled', () => {
        featureFlagService.isFeatureEnabled.mockImplementation((flag: FeatureFlags) => flag !== FeatureFlags.MobileDeviceManagement);
        fixture.detectChanges();
        expect(component.mobileDeviceManagementEnabled).toBe(false);
    });
});
