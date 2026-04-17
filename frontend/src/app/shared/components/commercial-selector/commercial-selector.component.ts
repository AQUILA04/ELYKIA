import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output } from '@angular/core';
import { ClientService } from 'src/app/client/service/client.service';
import { AuthService } from 'src/app/auth/service/auth.service';
import {UserProfile} from "../../models/user-profile.enum";
import {UserService} from "../../../user/service/user.service";

@Component({
  selector: 'app-commercial-selector',
  templateUrl: './commercial-selector.component.html',
  styleUrls: ['./commercial-selector.component.scss']
})
export class CommercialSelectorComponent implements OnInit, OnChanges {
  @Input() initialValue: string | null = null;
  @Output() commercialSelected = new EventEmitter<string | null>();

  agents: any[] = [];
  selectedAgent: string | null = null;
  isPromoter: boolean = false;

  constructor(
    private clientService: ClientService,
    private authService: AuthService,
    private userService: UserService
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

  onAgentChange(event: any): void {
    this.selectedAgent = event ? event.username : null;
    this.commercialSelected.emit(this.selectedAgent);
  }

  searchAgent(term: string, item: any) {
    term = term.toLowerCase();
    return item.username.toLowerCase().indexOf(term) > -1 ||
      item.firstname.toLowerCase().indexOf(term) > -1 ||
      item.lastname.toLowerCase().indexOf(term) > -1;
  }
}
