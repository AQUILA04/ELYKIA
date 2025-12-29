import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';

@Component({
    selector: 'app-permission-picklist',
    templateUrl: './permission-picklist.component.html',
    styleUrls: ['./permission-picklist.component.scss']
})
export class PermissionPicklistComponent implements OnInit, OnChanges {
    @Input() allPermissions: any[] = [];
    @Input() assignedPermissions: any[] = [];

    @Output() assignedPermissionsChange = new EventEmitter<any[]>();

    // Lists to display
    sourceList: any[] = [];
    targetList: any[] = [];

    // Selected items in the lists
    selectedSource: any[] = [];
    selectedTarget: any[] = [];

    constructor() { }

    ngOnInit(): void {
        this.initLists();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['allPermissions'] || changes['assignedPermissions']) {
            this.initLists();
        }
    }

    initLists() {
        // Ensure inputs are arrays
        const all = this.allPermissions || [];
        const assigned = this.assignedPermissions || [];

        // Target list is simply the assigned permissions
        // We clone objects to avoid reference issues if necessary, but assuming simple objects or strings
        this.targetList = [...assigned];

        // Source list is All - Assigned
        // We compare by 'name' if they are objects, or directly if strings
        this.sourceList = all.filter(p => !this.isPermissionInList(p, this.targetList));

        // Sort lists alphabetically by name
        this.sortList(this.sourceList);
        this.sortList(this.targetList);
    }

    isPermissionInList(permission: any, list: any[]): boolean {
        const name = permission.name || permission;
        return list.some(p => (p.name || p) === name);
    }

    sortList(list: any[]) {
        list.sort((a, b) => {
            const nameA = (a.name || a).toLowerCase();
            const nameB = (b.name || b).toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }

    moveToTarget() {
        if (this.selectedSource.length === 0) return;

        // Add to target
        this.targetList.push(...this.selectedSource);
        this.sortList(this.targetList);

        // Remove from source
        this.sourceList = this.sourceList.filter(p => !this.selectedSource.includes(p));

        // Clear selection
        this.selectedSource = [];

        // Emit change
        this.assignedPermissionsChange.emit(this.targetList);
    }

    moveToSource() {
        if (this.selectedTarget.length === 0) return;

        // Add to source
        this.sourceList.push(...this.selectedTarget);
        this.sortList(this.sourceList);

        // Remove from target
        this.targetList = this.targetList.filter(p => !this.selectedTarget.includes(p));

        // Clear selection
        this.selectedTarget = [];

        // Emit change
        this.assignedPermissionsChange.emit(this.targetList);
    }

    moveAllToTarget() {
        this.targetList.push(...this.sourceList);
        this.sortList(this.targetList);
        this.sourceList = [];
        this.assignedPermissionsChange.emit(this.targetList);
    }

    moveAllToSource() {
        this.sourceList.push(...this.targetList);
        this.sortList(this.sourceList);
        this.targetList = [];
        this.assignedPermissionsChange.emit(this.targetList);
    }
}
