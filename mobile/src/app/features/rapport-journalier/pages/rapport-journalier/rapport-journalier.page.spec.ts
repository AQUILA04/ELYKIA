import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RapportJournalierPage } from './rapport-journalier.page';

describe('RapportJournalierPage', () => {
  let component: RapportJournalierPage;
  let fixture: ComponentFixture<RapportJournalierPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RapportJournalierPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

