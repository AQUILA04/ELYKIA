import { StockOutputItem } from './stock-ouput-item';

export class StockOutputItemModel implements StockOutputItem {
  constructor(
    public id: string,
    public stockOutputId: string,
    public articleId: string,
    public quantity: number,
    public unitPrice: number,
    public totalPrice: number
  ) {}

  // Méthode pour calculer le totalPrice automatiquement
  public calculateTotal(): void {
    this.totalPrice = this.quantity * this.unitPrice;
  }

  // Méthode de validation
  public isValid(): boolean {
    return (
      !!this.id &&
      !!this.stockOutputId &&
      !!this.articleId &&
      this.quantity > 0 &&
      this.unitPrice >= 0
    );
  }
}
