import { Component, Input } from '@angular/core';
import { ArticleStateHistoryItem, Article } from '../../../service/item.service';

@Component({
    selector: 'app-state-timeline',
    templateUrl: './state-timeline.component.html',
    styleUrls: ['./state-timeline.component.scss'],
    standalone: false
})
export class StateTimelineComponent {
    @Input() stateHistory: ArticleStateHistoryItem[] = [];
    @Input() article?: Article;
    @Input() limit = 5;

    get displayedHistory(): ArticleStateHistoryItem[] {
        return this.stateHistory.slice(0, this.limit);
    }

    dotClass(newState: string): string {
        return newState === 'ENABLED' ? 'dot-green' : 'dot-red';
    }

    stateLabel(state: string): string {
        if (state === 'ENABLED') return 'ACTIF';
        if (state === 'DISABLED') return 'INACTIF';
        return state;
    }

    stateColor(state: string): string {
        return state === 'ENABLED' ? 'var(--ad-green)' : 'var(--ad-red)';
    }

    formatDate(dateStr?: string): string {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    formatDateTime(dateStr?: string): string {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
            + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
}
