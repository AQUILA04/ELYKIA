import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntitySyncListComponent } from './entity-sync-list.component';

describe('EntitySyncListComponent', () => {
  let component: EntitySyncListComponent;
  let fixture: ComponentFixture<EntitySyncListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [ EntitySyncListComponent ],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(EntitySyncListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
