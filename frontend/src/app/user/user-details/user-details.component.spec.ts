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
  let featureFlagService: jasmine.SpyObj<FeatureFlagService>;

  beforeEach(async () => {
    featureFlagService = jasmine.createSpyObj('FeatureFlagService', ['isFeatureEnabled']);
    featureFlagService.isFeatureEnabled.and.returnValue(false);

    const userService = jasmine.createSpyObj('UserService', ['getUserById']);
    userService.getUserById.and.returnValue(of({ data: { id: 1, username: 'test', userPermissions: [] } }));
    const permissionService = jasmine.createSpyObj('PermissionService', ['getAllList']);
    permissionService.getAllList.and.returnValue(of({ data: [] }));

    await TestBed.configureTestingModule({
      declarations: [UserDetailsComponent],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: UserDeviceService, useValue: jasmine.createSpyObj('UserDeviceService', ['listDevices']) },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['showError', 'showDefaultSucces', 'showConfirmation']) },
        { provide: TokenStorageService, useValue: jasmine.createSpyObj('TokenStorageService', ['checkConnectedUser']) },
        { provide: PermissionService, useValue: permissionService },
        { provide: FeatureFlagService, useValue: featureFlagService },
        { provide: ParameterService, useValue: jasmine.createSpyObj('ParameterService', ['getByKey']) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
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
    featureFlagService.isFeatureEnabled.and.callFake(
      (flag: FeatureFlags) => flag !== FeatureFlags.MobileDeviceManagement
    );
    fixture.detectChanges();
    expect(component.mobileDeviceManagementEnabled).toBeFalse();
  });
});
