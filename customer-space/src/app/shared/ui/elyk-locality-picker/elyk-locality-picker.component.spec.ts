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

  it('keeps AUTRES available when the search has no match and opens the free-text field', () => {
    const changes: string[] = [];
    const custom: boolean[] = [];
    component.registerOnChange((v) => changes.push(v));
    component.customChange.subscribe((v) => custom.push(v));
    component.query = 'zzzz';
    expect(component.filtered.length).toBe(0);

    component.selectOther();

    expect(component.customMode).toBeTrue();
    expect(component.open).toBeFalse();
    expect(changes).toEqual(['']);
    expect(custom).toEqual([true]);
    expect(component.displayLabel).toBe('AUTRES (à préciser)');

    component.onCustomText('  Adidogome ');
    expect(changes[1]).toBe('  Adidogome ');
    expect(component.displayLabel).toBe('Adidogome');
  });

  it('clears the free-text field when a listed locality is chosen', () => {
    const custom: boolean[] = [];
    component.customChange.subscribe((v) => custom.push(v));
    component.selectOther();
    component.onCustomText('Zone libre');
    component.select({ id: 1, name: 'Tokoin' });
    expect(component.customMode).toBeFalse();
    expect(component.value).toBe('Tokoin');
    expect(custom).toEqual([true, false]);
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
