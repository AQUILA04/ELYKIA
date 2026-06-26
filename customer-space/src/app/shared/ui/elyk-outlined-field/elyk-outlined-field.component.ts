import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

/**
 * Champ outlined avec label flottant et icône gold (maquettes S-02, S-07…).
 * Projeter un ion-input ou ion-textarea via ng-content.
 */
@Component({
  selector: 'app-elyk-outlined-field',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './elyk-outlined-field.component.html',
  styleUrls: ['./elyk-outlined-field.component.scss'],
})
export class ElykOutlinedFieldComponent {
  @Input() label = '';
  @Input() icon = '';
  @Input() error = '';
  @Input() hint = '';
}
