import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { StockTontineRequestFormComponent } from './stock-tontine-request-form.component';

describe('StockTontineRequestFormComponent', () => {
  let component: StockTontineRequestFormComponent;
  let fixture: ComponentFixture<StockTontineRequestFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StockTontineRequestFormComponent ],
      imports: [IonicModule.forRoot(), FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StockTontineRequestFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with one empty item', () => {
    expect(component.items.length).toBe(1);
    expect(component.items[0].article.id).toBe(0);
    expect(component.items[0].quantity).toBe(0);
  });

  it('should be invalid initially', () => {
    expect(component.isValid).toBeFalse();
  });

  it('should be valid when an item has an article and quantity > 0', () => {
    component.items[0].article.id = 12;
    component.items[0].quantity = 5;
    expect(component.isValid).toBeTrue();
  });

  it('should emit formSubmit with correct payload when submitted', () => {
    spyOn(component.formSubmit, 'emit');

    component.items[0].article.id = 12;
    component.items[0].quantity = 5;

    component.onSubmit();

    expect(component.formSubmit.emit).toHaveBeenCalledWith({
      items: [{ article: { id: 12 }, quantity: 5 }]
    });
  });

  it('should emit formCancel when onCancel is called', () => {
    spyOn(component.formCancel, 'emit');
    component.onCancel();
    expect(component.formCancel.emit).toHaveBeenCalled();
  });
});
