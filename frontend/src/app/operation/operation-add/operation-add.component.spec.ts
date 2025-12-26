import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationAddComponent } from './operation-add.component';

describe('OperationAddComponent', () => {
  let component: OperationAddComponent;
  let fixture: ComponentFixture<OperationAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationAddComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperationAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
