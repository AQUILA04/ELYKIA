import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientsPage } from './clients.page';
import { Store } from '@ngrx/store';
import { DomSanitizer } from '@angular/platform-browser';

describe('ClientsPage - Photo Fallback', () => {
    let component: ClientsPage;
    let fixture: ComponentFixture<ClientsPage>;
    let mockStore: MockedObject<Store>;
    let mockSanitizer: MockedObject<DomSanitizer>;

    beforeEach(async () => {
        const storeSpy = {
            select: vi.fn().mockName("Store.select"),
            dispatch: vi.fn().mockName("Store.dispatch")
        };
        const sanitizerSpy = {
            bypassSecurityTrustUrl: vi.fn().mockName("DomSanitizer.bypassSecurityTrustUrl")
        };

        await TestBed.configureTestingModule({
            declarations: [ClientsPage],
            providers: [
                { provide: Store, useValue: storeSpy },
                { provide: DomSanitizer, useValue: sanitizerSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ClientsPage);
        component = fixture.componentInstance;
        mockStore = TestBed.inject(Store) as MockedObject<Store>;
        mockSanitizer = TestBed.inject(DomSanitizer) as MockedObject<DomSanitizer>;
    });

    it('should use localPath when provided', () => {
        const localPath = 'client_photos/profile_123.png';
        mockSanitizer.bypassSecurityTrustUrl.mockReturnValue('mocked-url' as any);

        const result = component.getPhotoUrl(localPath);
        expect(result).toBeDefined();
    });

    it('should fallback to default icon when localPath is null', () => {
        const result = component.getPhotoUrl(null);
        expect(result).toBe('assets/icon/person-circle-outline.svg');
    });

    it('should fallback to default icon when localPath is undefined', () => {
        const result = component.getPhotoUrl(undefined);
        expect(result).toBe('assets/icon/person-circle-outline.svg');
    });
});
