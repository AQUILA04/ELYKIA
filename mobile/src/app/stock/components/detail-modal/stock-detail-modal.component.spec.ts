import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, ModalController } from '@ionic/angular';
import { StockDetailModalComponent } from './stock-detail-modal.component';

describe('StockDetailModalComponent', () => {
  let component: StockDetailModalComponent;
  let fixture: ComponentFixture<StockDetailModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    await TestBed.configureTestingModule({
      declarations: [StockDetailModalComponent],
      imports: [IonicModule.forRoot()],
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
    expect(component.isRequest).toBeTrue();

    component.type = 'return';
    expect(component.isRequest).toBeFalse();
  });

  it('should close the modal when close is called', () => {
    component.close();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });

  it('should return empty items array if operation is undefined or has no items', () => {
    expect(component.items).toEqual([]);

    component.operation = { id: 1, reference: 'REF-01', status: 'PENDING', createdAt: '2026-01-01' };
    expect(component.items).toEqual([]);
  });

  it('should return items array if operation has items', () => {
    const mockItems = [{ id: 1, quantity: 2, itemName: 'Test Item' }];
    component.operation = { id: 1, status: 'PENDING', createdAt: '2026-01-01', items: mockItems };
    expect(component.items).toEqual(mockItems);
  });
});
