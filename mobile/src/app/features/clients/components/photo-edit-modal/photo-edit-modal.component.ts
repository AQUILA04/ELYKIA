import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { Camera, CameraResultType } from '@capacitor/camera';
import { Client } from 'src/app/models/client.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-photo-edit-modal',
  templateUrl: './photo-edit-modal.component.html',
  styleUrls: ['./photo-edit-modal.component.scss'],
  imports: [CommonModule, IonicModule, FormsModule, ReactiveFormsModule]
})
export class PhotoEditModalComponent implements OnInit {

  @Input() client!: Client;

  photoEditForm: FormGroup;
  newProfilePhoto: { dataUrl: string; base64: string; } | null = null;
  newCardPhoto: { dataUrl: string; base64: string; } | null = null;

  constructor(
    private modalController: ModalController,
    private fb: FormBuilder
  ) {
    this.photoEditForm = this.fb.group({
      cardType: ['', Validators.required],
      cardID: ['', Validators.required]
    });
  }

  ngOnInit() {
    if (this.client) {
      this.photoEditForm.patchValue({
        cardType: this.client.cardType,
        cardID: this.client.cardID
      });
    }
  }

  async takeProfilePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl
      });
      if (image.dataUrl) {
        this.newProfilePhoto = {
          dataUrl: image.dataUrl,
          base64: image.dataUrl.split(',')[1]
        };
      }
    } catch (error) {
      console.error('Error taking profile picture', error);
    }
  }

  async takeCardPicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl
      });
      if (image.dataUrl) {
        this.newCardPhoto = {
          dataUrl: image.dataUrl,
          base64: image.dataUrl.split(',')[1]
        };
      }
    } catch (error) {
      console.error('Error taking card picture', error);
    }
  }

  dismissModal(data: any = null) {
    this.modalController.dismiss(data);
  }

  saveChanges() {
    if (this.photoEditForm.invalid && !this.newProfilePhoto && !this.newCardPhoto) {
      // Nothing to save
      return;
    }

    const dataToReturn = {
      ...this.photoEditForm.value,
      newProfilePhoto: this.newProfilePhoto,
      newCardPhoto: this.newCardPhoto,
    };

    this.dismissModal(dataToReturn);
  }
}
