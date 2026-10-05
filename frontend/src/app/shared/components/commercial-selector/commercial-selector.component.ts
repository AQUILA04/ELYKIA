import { Component, ElementRef, EventEmitter, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, Output } from '@angular/core';
import { ClientService } from 'src/app/client/service/client.service';
import { AuthService } from 'src/app/auth/service/auth.service';
import {UserProfile} from "../../models/user-profile.enum";
import {UserService} from "../../../user/service/user.service";

@Component({
  selector: 'app-commercial-selector',
  templateUrl: './commercial-selector.component.html',
  styleUrls: ['./commercial-selector.component.scss']
})
export class CommercialSelectorComponent implements OnInit, OnChanges, OnDestroy {
  @Input() initialValue: string | null = null;
  @Output() commercialSelected = new EventEmitter<string | null>();

  agents: any[] = [];
  selectedAgent: string | null = null;
  isPromoter: boolean = false;

  private readonly placeDropdownOnScroll = () => this.placeDropdown();

  constructor(
    private clientService: ClientService,
    private authService: AuthService,
    private userService: UserService,
    private elementRef: ElementRef<HTMLElement>
  ) { }

  ngOnInit(): void {
    this.checkUserRole();
    this.loadAgents();

    // Si une valeur initiale est fournie et que l'utilisateur n'est pas un promoteur (qui est forcé), on l'utilise
    if (this.initialValue && this.agents.some(agent => agent.username === this.initialValue) && !this.isPromoter) {
      this.selectedAgent = this.initialValue;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue'] && !this.isPromoter) {
      this.selectedAgent = changes['initialValue'].currentValue;
    }
  }

  checkUserRole(): void {
    const user = this.authService.getCurrentUser();
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    if (this.isPromoter) {
      this.selectedAgent = user.username;
      this.commercialSelected.emit(this.selectedAgent);
    }
  }

  loadAgents(): void {
    if (!this.isPromoter) {
      this.clientService.getAgents().subscribe({
        next: (data) => {
          this.agents = data;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des agents', err);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.detachDropdownTracking();
  }

  onDropdownOpen(): void {
    this.attachDropdownTracking();
    setTimeout(() => this.placeDropdown());
    setTimeout(() => this.placeDropdown(), 50);
  }

  onDropdownClose(): void {
    this.detachDropdownTracking();
  }

  onAgentChange(event: any): void {
    this.selectedAgent = event ? event.username : null;
    this.commercialSelected.emit(this.selectedAgent);
  }

  private attachDropdownTracking(): void {
    window.addEventListener('scroll', this.placeDropdownOnScroll, true);
    window.addEventListener('resize', this.placeDropdownOnScroll);
  }

  private detachDropdownTracking(): void {
    window.removeEventListener('scroll', this.placeDropdownOnScroll, true);
    window.removeEventListener('resize', this.placeDropdownOnScroll);
  }

  /**
   * ng-select (appendTo=body) place le panneau en position absolute.
   * Avec le défilement de la page, ce calcul le colle au titre au lieu du champ.
   * On le fixe sous le sélecteur, dans les coordonnées de l'écran.
   */
  private placeDropdown(): void {
    const select = this.elementRef.nativeElement.querySelector('ng-select');
    const panel = document.body.querySelector(':scope > .ng-dropdown-panel') as HTMLElement | null;
    if (!select || !panel) {
      return;
    }
    const rect = select.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < 180 && rect.top > spaceBelow;
    panel.style.position = 'fixed';
    panel.style.left = `${rect.left}px`;
    panel.style.width = `${rect.width}px`;
    panel.style.minWidth = `${rect.width}px`;
    panel.style.zIndex = '2000';
    if (openAbove) {
      panel.style.top = 'auto';
      panel.style.bottom = `${window.innerHeight - rect.top}px`;
    } else {
      panel.style.bottom = 'auto';
      panel.style.top = `${rect.bottom}px`;
    }
  }

  searchAgent(term: string, item: any) {
    term = term.toLowerCase();
    return item.username.toLowerCase().indexOf(term) > -1 ||
      item.firstname.toLowerCase().indexOf(term) > -1 ||
      item.lastname.toLowerCase().indexOf(term) > -1;
  }
}
