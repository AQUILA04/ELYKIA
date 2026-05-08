export class MonthEndCalculator {
  static getDaysUntilMonthEnd(date: Date = new Date()): number {
    const year = date.getFullYear();
    const month = date.getMonth();
    // Le jour 0 du mois suivant est le dernier jour du mois courant
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // On met à zéro les heures pour éviter les erreurs liées aux heures d'été ou aux fuseaux
    const end = new Date(lastDayOfMonth.getFullYear(), lastDayOfMonth.getMonth(), lastDayOfMonth.getDate());
    const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = end.getTime() - current.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static isInLastFiveDaysOfMonth(date: Date = new Date()): boolean {
    const days = this.getDaysUntilMonthEnd(date);
    return days >= 0 && days <= 5;
  }

  static getNextMonthDate(date: Date = new Date()): { month: number; year: number } {
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return {
      month: nextMonth.getMonth() + 1, // Les mois en JS sont de 0 à 11
      year: nextMonth.getFullYear()
    };
  }
}
