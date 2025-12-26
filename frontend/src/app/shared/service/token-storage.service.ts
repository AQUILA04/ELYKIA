import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { environment } from "src/environments/environment";

@Injectable({
    providedIn: 'root'
})
export class TokenStorageService {
    constructor(
        private router: Router
    ) { }

    signOut(): void {
        localStorage.clear();
        sessionStorage.clear();
    }

    public saveToken(token: string): void {
        localStorage.removeItem(environment.config.authtoken);
        localStorage.setItem(environment.config.authtoken, token);
    }

    public getToken(): string | null {
        return localStorage.getItem(environment.config.authtoken);
    }

    public saveUser(user: any): void {
        localStorage.removeItem(environment.config.authuser);
        localStorage.setItem(environment.config.authuser, JSON.stringify(user));
    }

    public getUser(): any {
        const user = localStorage.getItem(environment.config.authuser);
        return (user) ? JSON.parse(user) : {};
    }

    public saveAgencyId(agencyId: string): void {
        localStorage.removeItem('agencyId');
        localStorage.setItem('agencyId', agencyId);
    }

    public getAgencyId(): string | null {
        return localStorage.getItem('agencyId');
    }

    public checkConnectedUser() {
        const token = this.getToken();
        if (token == null) {
            this.router.navigate(['/login']);
        }
    }
}
