import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { StockDetailModalComponent } from './stock-detail-modal.component';

describe('StockDetailModalComponent', () => {
    let component: StockDetailModalComponent;
    let fixture: ComponentFixture<StockDetailModalComponent>;
    let modalCtrlSpy: MockedObject<ModalController>;

    beforeEach(async () => {
        modalCtrlSpy = {
            dismiss: vi.fn().mockName("ModalController.dismiss")
        } as unknown as MockedObject<ModalController>;

        await TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
            declarations: [StockDetailModalComponent],
            imports: [],
            providers: [
                { provide: ModalController, useValue: modalCtrlSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(StockDetailModalComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should compute isRequest correctly', () => {
        component.type = 'request';
        expect(component.isRequest).toBe(true);

        component.type = 'return';
        expect(component.isRequest).toBe(false);
    });

    it('should close the modal when close is called', () => {
        component.close();
        expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
    });

    it('should use operation total from API instead of recalculating from items', () => {
        component.type = 'request';
        component.operation = {
            id: 1,
            status: 'PENDING',
            createdAt: '2026-01-01',
            totalCreditSalePrice: 15000,
            items: [{ quantity: 1, unitPrice: 9999 }]
        };
        expect(component.operationTotal).toBe(15000);
    });

    it('should normalize items on init', () => {
        const mockItems = [{ id: 1, quantity: 2, itemName: 'Test Item' }];
        component.operation = { id: 1, status: 'PENDING', createdAt: '2026-01-01', items: mockItems };
        component.ngOnInit();
        expect(component.items).toEqual(mockItems);
    });
});
