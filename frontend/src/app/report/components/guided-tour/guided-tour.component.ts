import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    HostListener,
    OnDestroy,
    ViewChild,
    computed,
    effect
} from '@angular/core';
import { GuidedTourService } from './guided-tour.service';

interface Box {
    top: number;
    left: number;
    width: number;
    height: number;
}

const SPOT_PADDING = 8;
const POPOVER_WIDTH = 360;
const POPOVER_GAP = 14;
const MARGIN = 16;

/**
 * Place la bulle sous la zone, sinon au-dessus, sinon en bas de l'écran ;
 * toujours entièrement visible (coordonnées de l'écran, position: fixed).
 */
export function placePopover(
    target: { top: number; left: number; bottom: number },
    size: { width: number; height: number },
    viewport: { width: number; height: number }
): { top: number; left: number } {
    const below = target.bottom + SPOT_PADDING + POPOVER_GAP;
    const above = target.top - SPOT_PADDING - POPOVER_GAP - size.height;
    let top: number;
    if (below + size.height <= viewport.height - MARGIN) {
        top = below;
    } else if (above >= MARGIN) {
        top = above;
    } else {
        top = viewport.height - size.height - MARGIN;
    }
    top = Math.max(MARGIN, top);
    const left = Math.min(Math.max(MARGIN, target.left), viewport.width - size.width - MARGIN);
    return { top, left: Math.max(MARGIN, left) };
}

/**
 * Bulle et projecteur de la visite guidée. À placer une fois par page :
 * `<app-guided-tour></app-guided-tour>`. Échap ferme, flèches gauche/droite naviguent.
 */
@Component({
    selector: 'app-guided-tour',
    templateUrl: './guided-tour.component.html',
    styleUrls: ['./guided-tour.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class GuidedTourComponent implements OnDestroy {
    @ViewChild('primaryButton') primaryButton?: ElementRef<HTMLButtonElement>;
    @ViewChild('popover') popover?: ElementRef<HTMLElement>;

    spot: Box | null = null;
    popoverTop = 0;
    popoverLeft = 0;
    centered = true;

    readonly dots = computed(() => Array.from({ length: this.tour.count() }, (_, i) => i));

    private measureTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        public tour: GuidedTourService,
        private cdr: ChangeDetectorRef,
        private host: ElementRef<HTMLElement>
    ) {
        // Rattaché à <body> : un ancêtre avec transform, filter ou contain servirait sinon de repère
        // aux éléments position: fixed, et projecteur et bulle seraient décalés hors de l'écran.
        if (typeof document !== 'undefined') {
            document.body.appendChild(this.host.nativeElement);
        }
        effect(() => {
            const step = this.tour.step();
            this.tour.index();
            if (step) {
                this.locate(step.target, true);
            } else {
                this.spot = null;
            }
            this.cdr.markForCheck();
        });
    }

    ngOnDestroy(): void {
        if (this.measureTimer) {
            clearTimeout(this.measureTimer);
        }
        if (this.tour.active()) {
            this.tour.finish();
        }
        this.host.nativeElement.remove();
    }

    @HostListener('window:resize')
    @HostListener('window:scroll')
    onViewportChange(): void {
        const step = this.tour.step();
        if (step) {
            this.locate(step.target, false);
        }
    }

    @HostListener('document:keydown', ['$event'])
    onKeydown(event: KeyboardEvent): void {
        if (!this.tour.active()) {
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            this.tour.finish();
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.tour.next();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.tour.previous();
        }
    }

    private locate(target: string | undefined, scroll: boolean): void {
        const element = target ? document.querySelector<HTMLElement>(`[data-tour="${target}"]`) : null;
        if (!element) {
            this.spot = null;
            this.centered = true;
            this.focusLater();
            return;
        }
        if (scroll) {
            // Une zone plus haute que l'écran est alignée en haut, sinon centrée.
            const tall = element.getBoundingClientRect().height > window.innerHeight * 0.6;
            element.scrollIntoView({ block: tall ? 'start' : 'center', behavior: 'auto' });
        }
        if (this.measureTimer) {
            clearTimeout(this.measureTimer);
        }
        // Une frame pour laisser le défilement se terminer avant de mesurer.
        this.measureTimer = setTimeout(() => {
            this.measure(element);
            this.cdr.detectChanges();
            // Seconde passe : la bulle est rendue, sa hauteur réelle est connue.
            this.measure(element);
            this.cdr.markForCheck();
            if (scroll) {
                this.focusLater();
            }
        }, scroll ? 60 : 0);
    }

    private measure(element: HTMLElement): void {
        const rect = element.getBoundingClientRect();
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        this.spot = {
            top: rect.top - SPOT_PADDING,
            left: rect.left - SPOT_PADDING,
            width: rect.width + SPOT_PADDING * 2,
            height: rect.height + SPOT_PADDING * 2
        };
        this.centered = false;
        const popover = this.popover?.nativeElement;
        const position = placePopover(
            { top: rect.top, left: rect.left, bottom: rect.bottom },
            { width: Math.min(POPOVER_WIDTH, viewport.width - 32), height: popover?.offsetHeight || 260 },
            viewport
        );
        this.popoverTop = position.top;
        this.popoverLeft = position.left;
    }

    private focusLater(): void {
        setTimeout(() => this.primaryButton?.nativeElement.focus(), 0);
    }
}
