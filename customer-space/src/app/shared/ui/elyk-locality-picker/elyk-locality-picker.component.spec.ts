import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ElykLocalityPickerComponent } from './elyk-locality-picker.component';

describe('ElykLocalityPickerComponent', () => {
  let fixture: ComponentFixture<ElykLocalityPickerComponent>;
  let component: ElykLocalityPickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElykLocalityPickerComponent, FormsModule, IonicModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(ElykLocalityPickerComponent);
    component = fixture.componentInstance;
    component.localities = [
      { id: 1, name: 'Tokoin' },
      { id: 2, name: 'Agoè' },
      { id: 3, name: 'Bè' },
    ];
    fixture.detectChanges();
  });

  it('filters localities by search query', () => {
    component.query = 'ag';
    expect(component.filtered.map((l) => l.name)).toEqual(['Agoè']);
  });

  it('writes selected locality name via ControlValueAccessor', () => {
    const changes: string[] = [];
    component.registerOnChange((v) => changes.push(v));
    component.select({ id: 1, name: 'Tokoin' });
    expect(component.value).toBe('Tokoin');
    expect(changes).toEqual(['Tokoin']);
    expect(component.open).toBeFalse();
  });

  it('emits retryLoad when retry is clicked', () => {
    const spy = jasmine.createSpy('retry');
    component.retryLoad.subscribe(spy);
    component.loadError = 'Erreur';
    fixture.detectChanges();
    component.onRetryClick();
    expect(spy).toHaveBeenCalled();
  });
});
