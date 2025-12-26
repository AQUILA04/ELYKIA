import { Component, Input } from '@angular/core';
import { KpiCardData } from '../../types/bi.types';

@Component({
  selector: 'app-bi-kpi-card',
  templateUrl: './bi-kpi-card.component.html',
  styleUrls: ['./bi-kpi-card.component.scss']
})
export class BiKpiCardComponent {
  @Input() data!: KpiCardData;
  @Input() loading: boolean = false;

  /**
   * Retourne la classe CSS pour la couleur de la carte
   */
  getColorClass(): string {
    return this.data.color ? `kpi-card--${this.data.color}` : 'kpi-card--primary';
  }

  /**
   * Retourne la classe CSS pour l'évolution
   */
  getEvolutionClass(): string {
    if (!this.data.evolution) return '';
    return this.data.evolution > 0 ? 'evolution--positive' : 'evolution--negative';
  }

  /**
   * Retourne l'icône pour l'évolution
   */
  getEvolutionIcon(): string {
    if (!this.data.evolution) return '';
    return this.data.evolution > 0 ? 'trending_up' : 'trending_down';
  }

  /**
   * Formate la valeur selon le type
   */
  getFormattedValue(): string {
    if (typeof this.data.value === 'string') {
      return this.data.value;
    }

    switch (this.data.format) {
      case 'currency':
        return this.formatCurrency(this.data.value);
      case 'percentage':
        return this.formatPercentage(this.data.value);
      case 'number':
      default:
        return this.formatNumber(this.data.value);
    }
  }

  /**
   * Formate un nombre en devise FCFA
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + ' FCFA';
  }

  /**
   * Formate un pourcentage
   */
  private formatPercentage(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value) + '%';
  }

  /**
   * Formate un nombre
   */
  private formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Génère les points pour le sparkline
   */
  getSparklinePoints(): string {
    if (!this.data.trend || this.data.trend.length === 0) {
      return '';
    }

    const width = 100;
    const height = 20;
    const points = this.data.trend;
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;

    return points
      .map((value, index) => {
        const x = (index / (points.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }
}
