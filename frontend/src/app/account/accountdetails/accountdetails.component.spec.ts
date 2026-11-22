import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountdetailsComponent } from './accountdetails.component';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';

describe('AccountdetailsComponent', () => {
    let component: AccountdetailsComponent;
    let fixture: ComponentFixture<AccountdetailsComponent>;
    let router: MockedObject<Pick<Router, 'navigate'>>;

    beforeEach(async () => {
        router = {
            navigate: vi.fn().mockName("Router.navigate")
        };
        await TestBed.configureTestingModule({
            declarations: [AccountdetailsComponent],
            providers: [
                { provide: Router, useValue: router },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: { get: () => '42' } } },
                },
                {
                    provide: TokenStorageService,
                    useValue: { checkConnectedUser: () => undefined },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AccountdetailsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and redirect to account list with open id', () => {
        expect(component).toBeTruthy();
        expect(router.navigate).toHaveBeenCalledWith(['/account/list'], expect.objectContaining({ queryParams: { open: '42' }, replaceUrl: true }));
    });
});
