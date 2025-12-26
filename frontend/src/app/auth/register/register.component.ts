import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../service/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,

  ) {
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      gender: ['male', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phone: ['', Validators.required],
      profilId: [0, Validators.required]
    });
  }

  ngOnInit(): void {
  }

//   onSubmit(): void {
//     if (this.registerForm.valid) {
//       this.isLoading = true;
//       this.authService.signup(this.registerForm.value).subscribe(
//         response => {
//           console.log('Sign up successful', response);
//           this.isLoading = false;
//           this.router.navigate(['/login']); 
//         },
//         error => {
//           console.error('Sign up error', error);
//           this.isLoading = false;
//         }
//       );
//     }
//   }
}