import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  AlertDialogComponent,
  AlertDialogData,
  AlertDialogResult,
} from './alert-dialog.component';

describe('AlertDialogComponent', () => {
  let fixture: ComponentFixture<AlertDialogComponent>;
  let component: AlertDialogComponent;
  let dialogRefClose: ReturnType<typeof vi.fn>;

  function createComponent(data: AlertDialogData): void {
    dialogRefClose = vi.fn();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AlertDialogComponent],
      providers: [
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: { close: dialogRefClose } },
      ],
    });

    fixture = TestBed.createComponent(AlertDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('renders confirmation dialog and resolves confirmed=true on confirm click', () => {
    createComponent({
      mode: 'confirm',
      variant: 'danger',
      title: 'Confirmation de suppression',
      message: 'Voulez-vous vraiment supprimer cet élément ?',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      showCancelButton: true,
    });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="elykia-alert-title"]')?.textContent?.trim()).toBe(
      'Confirmation de suppression',
    );
    expect(el.querySelector('[data-testid="elykia-alert-message"]')?.textContent?.trim()).toContain(
      'Voulez-vous vraiment supprimer cet élément ?',
    );

    const confirmBtn = el.querySelector('[data-testid="elykia-alert-confirm"]') as HTMLButtonElement;
    confirmBtn.click();

    expect(dialogRefClose).toHaveBeenCalledWith({ confirmed: true } satisfies AlertDialogResult);
  });

  it('resolves confirmed=false on cancel click', () => {
    createComponent({
      mode: 'confirm',
      variant: 'primary',
      title: 'Déconnexion',
      message: 'Confirmer la déconnexion ?',
      confirmButtonText: 'Oui',
      cancelButtonText: 'Annuler',
      showCancelButton: true,
    });

    const cancelBtn = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="elykia-alert-cancel"]',
    ) as HTMLButtonElement;
    cancelBtn.click();

    expect(dialogRefClose).toHaveBeenCalledWith({ confirmed: false } satisfies AlertDialogResult);
  });

  it('hides cancel button in single-action alert mode', () => {
    createComponent({
      mode: 'action',
      variant: 'info',
      title: 'Licence Expirée',
      message: 'Votre licence a expiré.',
      confirmButtonText: 'Réactiver la Licence',
      showCancelButton: false,
    });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="elykia-alert-cancel"]')).toBeNull();
    expect(el.querySelector('[data-testid="elykia-alert-confirm"]')?.textContent?.trim()).toBe(
      'Réactiver la Licence',
    );
  });

  it('validates prompt input before closing and clears error on edit', () => {
    createComponent({
      mode: 'prompt',
      variant: 'primary',
      title: 'Réinitialiser le mot de passe',
      message: 'Définissez un mot de passe temporaire.',
      confirmButtonText: 'Réinitialiser',
      cancelButtonText: 'Annuler',
      showCancelButton: true,
      inputType: 'password',
      inputLabel: 'Mot de passe temporaire',
      inputPlaceholder: 'Au moins 6 caractères',
      minLength: 6,
      validator: (value) =>
        !value || value.length < 6 ? 'Le mot de passe doit contenir au moins 6 caractères.' : null,
    });

    component.inputValue = '123';
    component.confirm();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(dialogRefClose).not.toHaveBeenCalled();
    expect(el.querySelector('[data-testid="elykia-alert-error"]')?.textContent?.trim()).toBe(
      'Le mot de passe doit contenir au moins 6 caractères.',
    );

    component.inputValue = 'secret123';
    component.onInputChange();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="elykia-alert-error"]')).toBeNull();

    component.confirm();
    expect(dialogRefClose).toHaveBeenCalledWith({
      confirmed: true,
      value: 'secret123',
    } satisfies AlertDialogResult);
  });
});
