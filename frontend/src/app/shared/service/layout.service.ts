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
        const isOpen = !this.isSidebarOpenSubject.value;
        this.isSidebarOpenSubject.next(isOpen);
        if (isOpen) {
            document.body.classList.add('sidebar-open');
        } else {
            document.body.classList.remove('sidebar-open');
        }
    }

    openSidebar() {
        this.isSidebarOpenSubject.next(true);
        document.body.classList.add('sidebar-open');
    }

    closeSidebar() {
        this.isSidebarOpenSubject.next(false);
        document.body.classList.remove('sidebar-open');
    }
}
