import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ArticleHistoryItem } from '../../../service/item.service';

export interface MovementListDialogData {
  movements: ArticleHistoryItem[];
  articleName?: string;
}

@Component({
  selector: 'app-movement-list-dialog',
  templateUrl: './movement-list-dialog.component.html',
  styleUrls: ['./movement-list-dialog.component.scss'],
  standalone: false
})
export class MovementListDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<MovementListDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MovementListDialogData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}
