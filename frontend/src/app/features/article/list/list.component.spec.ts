import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ListComponent } from './list.component';
import { WarehouseStockService } from '../../stock/services/warehouse-stock.service';

describe('ListComponent', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;
  let warehouseStockServiceSpy: { downloadSupplierPurchaseOrderPdf: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    warehouseStockServiceSpy = {
      downloadSupplierPurchaseOrderPdf: vi.fn().mockReturnValue(of(new Blob(['pdf'])))
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxPermissionsModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [ ListComponent ],
      providers: [
        { provide: WarehouseStockService, useValue: warehouseStockServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

