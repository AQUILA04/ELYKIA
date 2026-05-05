import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    private isSidebarOpenSubject = new BehaviorSubject<boolean>(false);
    public isSidebarOpen$ = this.isSidebarOpenSubject.asObservable();

    constructor(@Inject(DOCUMENT) private document: Document) { }

    toggleSidebar() {
        const isOpen = !this.isSidebarOpenSubject.value;
        this.isSidebarOpenSubject.next(isOpen);
        if (isOpen) {
            this.document.body.classList.add('sidebar-open');
        } else {
            this.document.body.classList.remove('sidebar-open');
        }
    }

    openSidebar() {
        this.isSidebarOpenSubject.next(true);
        this.document.body.classList.add('sidebar-open');
    }

    closeSidebar() {
        this.isSidebarOpenSubject.next(false);
        this.document.body.classList.remove('sidebar-open');
    }
}
