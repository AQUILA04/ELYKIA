import { Component, Input } from '@angular/core';
import { PopoverController } from '@ionic/angular';

@Component({
  selector: 'app-client-menu',
  templateUrl: './client-menu.component.html',
  standalone: false
})
export class ClientMenuComponent {
  @Input() clientId!: string;
  @Input() editDisabled = false;
  @Input() deleteDisabled = false;
  @Input() updateLocationDisabled = false;
  @Input() updatePhotoDisabled = false;

  constructor(private popoverController: PopoverController) {}

  edit() {
    this.popoverController.dismiss({ action: 'edit' });
  }

  delete() {
    this.popoverController.dismiss({ action: 'delete' });
  }

  editBalance() {
    this.popoverController.dismiss({ action: 'editBalance' });
  }

  updateLocation() {
    this.popoverController.dismiss({ action: 'updateLocation' });
  }

  updatePhoto() {
    this.popoverController.dismiss({ action: 'updatePhoto' });
  }
}
