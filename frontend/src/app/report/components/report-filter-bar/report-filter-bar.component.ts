import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { PeriodPreset, ReportFilters, presetRange } from '../../models/report-period';

export interface AgentOption {
    username: string;
}

/** Barre de filtres partagée : période (raccourcis ou dates) et commercial. */
@Component({
    selector: 'app-report-filter-bar',
    templateUrl: './report-filter-bar.component.html',
    styleUrls: ['./report-filter-bar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ReportFilterBarComponent implements OnChanges {
    @Input({ required: true }) filters!: ReportFilters;
    @Input() agents: AgentOption[] = [];
    /** Masqué pour un commercial (il ne voit que ses données). */
    @Input() showCommercial = true;
    @Output() filtersChange = new EventEmitter<ReportFilters>();

    readonly presets: { id: Exclude<PeriodPreset, 'custom'>; label: string }[] = [
        { id: 'today', label: 'Aujourd\'hui' },
        { id: 'week', label: 'Semaine' },
        { id: 'month', label: 'Mois' }
    ];

    customOpen = false;
    customStart = '';
    customEnd = '';

    ngOnChanges(): void {
        this.customStart = this.filters.start;
        this.customEnd = this.filters.end;
        this.customOpen = this.filters.preset === 'custom';
    }

    selectPreset(preset: Exclude<PeriodPreset, 'custom'>): void {
        this.customOpen = false;
        this.filtersChange.emit({ ...this.filters, preset, ...presetRange(preset) });
    }

    openCustom(): void {
        this.customOpen = true;
    }

    get customInvalid(): boolean {
        return !this.customStart || !this.customEnd || this.customStart > this.customEnd;
    }

    applyCustom(): void {
        if (this.customInvalid) {
            return;
        }
        this.filtersChange.emit({ ...this.filters, preset: 'custom', start: this.customStart, end: this.customEnd });
    }

    onCommercialChange(agent: AgentOption | string | null): void {
        const commercial = agent == null ? null : typeof agent === 'string' ? agent : agent.username;
        this.filtersChange.emit({ ...this.filters, commercial: commercial || null });
    }

    searchAgent = (term: string, item: AgentOption) => item.username.toLowerCase().includes(term.toLowerCase());
}
