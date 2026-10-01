import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { NotificationsPage } from './notifications.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerNotificationInboxService } from '../../shared/services/customer-notification-inbox.service';
import { CustomerNotification } from '../../shared/models/customer.model';

describe('NotificationsPage', () => {
  let fixture: ComponentFixture<NotificationsPage>;
  let api: jasmine.SpyObj<CustomerApiService>;
  let inbox: jasmine.SpyObj<CustomerNotificationInboxService>;
  let router: Router;

  const items: CustomerNotification[] = [
    {
      id: 1,
      type: 'REGISTRATION_ACTIVATED',
      title: 'Compte activé',
      message: 'Votre compte est activé. Bienvenue !',
      linkPath: '/dashboard',
      read: false,
      createdAt: '2026-09-27T10:00:00',
    },
    {
      id: 2,
      type: 'CREDIT_PAYMENT_VALIDATED',
      title: 'Paiement validé',
      message: 'Votre paiement de 35 000 F a été validé.',
      linkPath: '/purchases/101',
      read: true,
      createdAt: '2026-09-26T10:00:00',
    },
  ];

  beforeEach(async () => {
    const freshItems = items.map((n) => ({ ...n, read: n.id === 1 ? false : true }));
    api = jasmine.createSpyObj('CustomerApiService', [
      'getNotifications',
      'markNotificationRead',
      'markAllNotificationsRead',
    ]);
    api.getNotifications.and.returnValue(of(freshItems));
    api.markNotificationRead.and.returnValue(of({ ...freshItems[0], read: true }));
    api.markAllNotificationsRead.and.returnValue(of({ updated: 1 }));

    inbox = jasmine.createSpyObj('CustomerNotificationInboxService', ['setUnreadCount', 'refresh']);

    await TestBed.configureTestingModule({
      imports: [NotificationsPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: CustomerApiService, useValue: api },
        { provide: CustomerNotificationInboxService, useValue: inbox },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    fixture = TestBed.createComponent(NotificationsPage);
  });

  it('loads notifications on ionViewWillEnter', async () => {
    await fixture.componentInstance.ionViewWillEnter();
    expect(fixture.componentInstance.notifications.length).toBe(2);
    expect(inbox.setUnreadCount).toHaveBeenCalledWith(1);
  });

  it('marks all as read', async () => {
    await fixture.componentInstance.ionViewWillEnter();
    await fixture.componentInstance.markAllRead();
    expect(api.markAllNotificationsRead).toHaveBeenCalled();
    expect(fixture.componentInstance.notifications.every((n) => n.read)).toBeTrue();
    expect(inbox.setUnreadCount).toHaveBeenCalledWith(0);
  });

  it('opens notification, marks read and navigates', async () => {
    await fixture.componentInstance.ionViewWillEnter();
    await fixture.componentInstance.openNotification(fixture.componentInstance.notifications[0]);
    expect(api.markNotificationRead).toHaveBeenCalledWith(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('sets loadError when API fails', async () => {
    api.getNotifications.and.returnValue(throwError(() => new Error('fail')));
    await fixture.componentInstance.ionViewWillEnter();
    expect(fixture.componentInstance.loadError).toBeTrue();
  });
});
