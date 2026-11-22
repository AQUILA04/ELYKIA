import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploreContainerComponent } from './explore-container.component';

describe('ExploreContainerComponent', () => {
  let component: ExploreContainerComponent;
  let fixture: ComponentFixture<ExploreContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [ExploreContainerComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
