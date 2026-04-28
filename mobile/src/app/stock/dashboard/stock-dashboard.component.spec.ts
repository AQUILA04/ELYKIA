import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, SegmentCustomEvent } from '@ionic/angular';
import { StockDashboardComponent } from './stock-dashboard.component';
import { StockStateService } from '../services/stock-state.service';
import { take } from 'rxjs/operators';
import { By } from '@angular/platform-browser';

describe('StockDashboardComponent', () => {
  let component: StockDashboardComponent;
  let fixture: ComponentFixture<StockDashboardComponent>;
  let stockStateService: StockStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StockDashboardComponent],
      imports: [IonicModule.forRoot()],
      providers: [StockStateService]
    }).compileComponents();

    fixture = TestBed.createComponent(StockDashboardComponent);
    component = fixture.componentInstance;
    stockStateService = TestBed.inject(StockStateService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose context$ Observable bound to StockStateService', (done) => {
    component.context$.pipe(take(1)).subscribe(ctx => {
      expect(ctx).toBe('STANDARD');
      done();
    });
  });

  it('should reset context to STANDARD on init', (done) => {
    stockStateService.setContext('TONTINE');
    component.ngOnInit();
    
    stockStateService.context$.pipe(take(1)).subscribe(ctx => {
      expect(ctx).toBe('STANDARD');
      done();
    });
  });

  it('should call stockStateService.setContext with TONTINE when ion-segment fires ionChange with TONTINE', (done) => {
    const segmentElement = fixture.debugElement.query(By.css('ion-segment'));
    const mockEvent = { detail: { value: 'TONTINE' } } as unknown as SegmentCustomEvent;
    segmentElement.triggerEventHandler('ionChange', mockEvent);

    stockStateService.context$.pipe(take(1)).subscribe(ctx => {
      expect(ctx).toBe('TONTINE');
      done();
    });
  });

  it('should call stockStateService.setContext with STANDARD when ion-segment fires ionChange with STANDARD', (done) => {
    const segmentElement = fixture.debugElement.query(By.css('ion-segment'));
    // Switch to TONTINE first
    segmentElement.triggerEventHandler('ionChange', { detail: { value: 'TONTINE' } } as unknown as SegmentCustomEvent);
    // Then switch back to STANDARD
    segmentElement.triggerEventHandler('ionChange', { detail: { value: 'STANDARD' } } as unknown as SegmentCustomEvent);

    stockStateService.context$.pipe(take(1)).subscribe(ctx => {
      expect(ctx).toBe('STANDARD');
      done();
    });
  });

  it('should reflect context changes from service in context$ Observable (AC2 - child presenters receive state)', (done) => {
    stockStateService.setContext('TONTINE');

    component.context$.pipe(take(1)).subscribe(ctx => {
      expect(ctx).toBe('TONTINE');
      done();
    });
  });
});
