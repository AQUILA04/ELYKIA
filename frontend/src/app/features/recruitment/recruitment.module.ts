import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RecruitmentRoutingModule } from './recruitment-routing.module';
import { RecruitmentService } from './services/recruitment.service';
import { OfferListComponent } from './pages/offer-list/offer-list.component';
import { OfferFormComponent } from './pages/offer-form/offer-form.component';
import { ApplicationListComponent } from './pages/application-list/application-list.component';
import { ApplicationDetailComponent } from './pages/application-detail/application-detail.component';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@NgModule({
  declarations: [
    OfferListComponent,
    OfferFormComponent,
    ApplicationListComponent,
    ApplicationDetailComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RecruitmentRoutingModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  providers: [RecruitmentService],
})
export class RecruitmentModule {}
