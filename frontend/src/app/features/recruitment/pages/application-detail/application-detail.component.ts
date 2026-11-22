import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RecruitmentService } from '../../services/recruitment.service';
import { JobApplication } from '../../models/recruitment.model';

@Component({
  selector: 'app-application-detail',
  templateUrl: './application-detail.component.html',
  styleUrls: ['./application-detail.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class ApplicationDetailComponent implements OnInit {
  application?: JobApplication;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recruitmentService: RecruitmentService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.recruitmentService.getApplication(id).subscribe((app) => {
      this.application = app;
    });
  }

  downloadCv(): void {
    if (!this.application?.id) return;
    this.recruitmentService.downloadCv(this.application.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.application?.cvFileName || `cv-${this.application?.id}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  back(): void {
    this.router.navigate(['/recruitment/applications']);
  }

  genderLabel(gender?: string): string {
    const map: Record<string, string> = {
      MALE: 'Homme', FEMALE: 'Femme', OTHER: 'Autre', UNSPECIFIED: 'Non précisé',
    };
    return gender ? (map[gender] || gender) : '—';
  }
}
