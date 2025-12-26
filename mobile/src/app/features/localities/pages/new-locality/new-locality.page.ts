import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { NavController, ToastController } from '@ionic/angular';
import { LocalityActions } from 'src/app/store/locality';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-new-locality',
  templateUrl: './new-locality.page.html',
  styleUrls: ['./new-locality.page.scss'],
  standalone: false
})
export class NewLocalityPage implements OnInit {
  form: FormGroup;
  private unsubscribe$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actions$: Actions
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.actions$.pipe(
      ofType(LocalityActions.addLocalitySuccess),
      takeUntil(this.unsubscribe$)
    ).subscribe(async () => {
      const toast = await this.toastCtrl.create({
        message: 'Localité enregistrée avec succès',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      toast.present();
      this.navCtrl.back();
    });

    this.actions$.pipe(
      ofType(LocalityActions.addLocalityFailure),
      takeUntil(this.unsubscribe$)
    ).subscribe(async () => {
      const toast = await this.toastCtrl.create({
        message: 'Erreur lors de l\'enregistrement de la localité',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    });
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  onSubmit() {
    if (this.form.valid) {
      this.store.dispatch(LocalityActions.addLocality({ locality: this.form.value }));
    }
  }
}
