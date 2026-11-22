import { Injectable, computed, signal } from '@angular/core';
import { TokenStorageService } from '@shared/service/token-storage.service';

/** Une étape : la zone `[data-tour="target"]` est mise en avant ; sans cible, la bulle est centrée. */
export interface TourStep {
    target?: string;
    title: string;
    body: string;
}

/** Un tutoriel ; changer `version` le repropose à ceux qui l'ont déjà vu. */
export interface TourDefinition {
    id: string;
    version: number;
    steps: TourStep[];
}

interface TourState {
    tour: TourDefinition;
    index: number;
}

/**
 * Visite guidée intégrée, sans librairie externe.
 * Vue une fois par utilisateur et par version (localStorage) ; relançable à tout moment.
 * Jamais lancée automatiquement sous automatisation (Playwright) pour ne pas bloquer les tests.
 */
@Injectable({ providedIn: 'root' })
export class GuidedTourService {
    private readonly state = signal<TourState | null>(null);

    readonly active = computed(() => this.state() !== null);
    readonly step = computed<TourStep | null>(() => {
        const current = this.state();
        return current ? current.tour.steps[current.index] ?? null : null;
    });
    readonly index = computed(() => this.state()?.index ?? 0);
    readonly count = computed(() => this.state()?.tour.steps.length ?? 0);
    readonly isFirst = computed(() => this.index() === 0);
    readonly isLast = computed(() => this.index() >= this.count() - 1);

    constructor(private tokenStorage: TokenStorageService) { }

    /** Lance le tutoriel s'il n'a jamais été vu. Renvoie vrai s'il démarre. */
    startIfFirstVisit(tour: TourDefinition): boolean {
        if (this.state() || this.isAutomated() || this.hasSeen(tour)) {
            return false;
        }
        return this.start(tour);
    }

    /** Lance le tutoriel, même déjà vu (bouton « Visite guidée »). */
    start(tour: TourDefinition): boolean {
        if (!tour.steps.length) {
            return false;
        }
        this.state.set({ tour, index: 0 });
        return true;
    }

    next(): void {
        const current = this.state();
        if (!current) {
            return;
        }
        if (current.index >= current.tour.steps.length - 1) {
            this.finish();
            return;
        }
        this.state.set({ ...current, index: current.index + 1 });
    }

    previous(): void {
        const current = this.state();
        if (current && current.index > 0) {
            this.state.set({ ...current, index: current.index - 1 });
        }
    }

    /** Termine ou passe le tutoriel : il ne sera plus proposé automatiquement. */
    finish(): void {
        const current = this.state();
        if (current) {
            this.markSeen(current.tour);
        }
        this.state.set(null);
    }

    hasSeen(tour: TourDefinition): boolean {
        try {
            return localStorage.getItem(this.storageKey(tour)) === '1';
        } catch {
            return false;
        }
    }

    markSeen(tour: TourDefinition): void {
        try {
            localStorage.setItem(this.storageKey(tour), '1');
        } catch {
            // Stockage indisponible (navigation privée) : le tutoriel sera reproposé, sans gravité.
        }
    }

    storageKey(tour: TourDefinition): string {
        const username = this.tokenStorage.getUser()?.username || 'anonymous';
        return `elykia.tour.${tour.id}.v${tour.version}.${username}`;
    }

    private isAutomated(): boolean {
        return typeof navigator !== 'undefined' && navigator.webdriver === true;
    }
}
