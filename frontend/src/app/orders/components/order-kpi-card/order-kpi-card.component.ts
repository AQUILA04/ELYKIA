import { Component, Input, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { KPICardConfig } from '../../types/order.types';

@Component({
  selector: 'app-order-kpi-card',
  templateUrl: './order-kpi-card.component.html',
  styleUrls: ['./order-kpi-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderKpiCardComponent implements OnInit {
  @Input() title: string = '';
  @Input() value: string | number = 0;
  @Input() icon: string = '';
  @Input() color: 'primary' | 'success' | 'warning' | 'info' | 'danger' = 'primary';
  @Input() subtitle?: string;
  @Input() trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  @Input() loading: boolean = false;

  ngOnInit(): void {
    // Ensure default values are set
    if (this.value === null || this.value === undefined) {
      this.value = 0;
    }
    if (!this.title) {
      this.title = '';
    }
    if (!this.icon) {
      this.icon = 'info';
    }
  }

  /**
   * Retourne la classe CSS pour la couleur de la carte
   */
  get cardColorClass(): string {
    return `kpi-card--${this.color}`;
  }

  /**
   * Retourne l'icône de tendance selon la direction
   */
  get trendIcon(): string {
    if (!this.trend) return '';
    return this.trend.direction === 'up' ? 'trending_up' : 'trending_down';
  }

  /**
   * Retourne la classe CSS pour la couleur de la tendance
   */
  get trendColorClass(): string {
    if (!this.trend) return '';
    return this.trend.direction === 'up' ? 'trend--positive' : 'trend--negative';
  }

  /**
   * Formate la valeur pour l'affichage
   */
  get formattedValue(): string {
    // Vérifier si la valeur existe
    if (this.value === null || this.value === undefined) {
      return '-';
    }

    if (typeof this.value === 'number') {
      // Si c'est un montant (contient 'XOF' dans le titre ou subtitle)
      if (this.title?.includes('XOF') || this.subtitle?.includes('XOF') || 
          this.title?.toLowerCase().includes('montant') || 
          this.title?.toLowerCase().includes('valeur') ||
          this.title?.toLowerCase().includes('bénéfice') ||
          this.title?.toLowerCase().includes('pipeline')) {
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'XOF',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(this.value);
      }
      
      // Si c'est un pourcentage
      if (this.title?.includes('%') || this.subtitle?.includes('%') || 
          this.title?.toLowerCase().includes('taux')) {
        return `${this.value}%`;
      }
      
      // Nombre normal avec séparateurs de milliers
      return new Intl.NumberFormat('fr-FR').format(this.value);
    }
    
    // Pour les chaînes de caractères ou autres types
    return this.value?.toString() || '-';
  }

  /**
   * Formate la valeur de tendance pour l'affichage
   */
  get formattedTrendValue(): string {
    if (!this.trend) return '';
    
    const sign = this.trend.direction === 'up' ? '+' : '';
    return `${sign}${this.trend.value}%`;
  }
}