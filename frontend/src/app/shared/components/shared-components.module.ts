import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PermissionPicklistComponent } from './permission-picklist/permission-picklist.component';

@NgModule({
    declarations: [
        PermissionPicklistComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MatListModule,
        MatButtonModule,
        MatIconModule
    ],
    exports: [
        PermissionPicklistComponent
    ]
})
export class SharedComponentsModule { }
