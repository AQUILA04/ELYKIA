import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    private isSidebarOpenSubject = new BehaviorSubject<boolean>(false);
    public isSidebarOpen$ = this.isSidebarOpenSubject.asObservable();

    constructor() { }

    toggleSidebar() {
        this.isSidebarOpenSubject.next(!this.isSidebarOpenSubject.value);
    }

    openSidebar() {
        this.isSidebarOpenSubject.next(true);
    }

    closeSidebar() {
        this.isSidebarOpenSubject.next(false);
    }
}
