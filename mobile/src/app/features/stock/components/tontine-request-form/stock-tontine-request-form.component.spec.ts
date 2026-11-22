import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IonInput, IonSelect, IonSelectOption } from '@ionic/angular';
import { of } from 'rxjs';
import { ArticleService } from '../../../../core/services/article.service';
import { StockTontineRequestFormComponent } from './stock-tontine-request-form.component';

describe('StockTontineRequestFormComponent', () => {
    let component: StockTontineRequestFormComponent;
    let fixture: ComponentFixture<StockTontineRequestFormComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                { provide: ArticleService, useValue: { searchArticlesPaginated: vi.fn().mockReturnValue(of({ articles: [], total: 0 })) } },
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            declarations: [StockTontineRequestFormComponent],
            imports: [CommonModule, FormsModule, IonInput, IonSelect, IonSelectOption]
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
        expect(component.isValid).toBe(false);
    });

    it('should be valid when an item has an article and quantity > 0', () => {
        component.items[0].article.id = 12;
        component.items[0].quantity = 5;
        expect(component.isValid).toBe(true);
    });

    it('should emit formSubmit with correct payload when submitted', () => {
        vi.spyOn(component.formSubmit, 'emit');

        component.items[0].article.id = 12;
        component.items[0].quantity = 5;

        component.onSubmit();

        expect(component.formSubmit.emit).toHaveBeenCalledWith({
            items: [{ article: { id: 12 }, quantity: 5 }]
        });
    });

    it('should emit formCancel when onCancel is called', () => {
        vi.spyOn(component.formCancel, 'emit');
        component.onCancel();
        expect(component.formCancel.emit).toHaveBeenCalled();
    });
});
