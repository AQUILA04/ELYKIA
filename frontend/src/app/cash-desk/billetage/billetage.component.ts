import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-billetage',
  templateUrl: './billetage.component.html',
  styleUrls: ['./billetage.component.scss']
})
export class BilletageComponent implements OnInit {
  @Output() billetageData = new EventEmitter<{ totalAmount: number, ticketingData: { [key: string]: number } }>();
  
  billets = ['10000', '5000', '2000', '1000', '500'];
  pieces = ['500', '250', '200', '100', '50', '25'];
  totalAmount: number = 0;
  ticketingData: { [key: string]: number } = {}; 

  ngOnInit(): void {}

  getBilletValue(billet: string): number {
    return parseInt(billet, 10);
  }

  getPieceValue(piece: string): number {
    return parseInt(piece, 10);
  }

  updateTotal(value: number, quantity: number): void {
    if (quantity > 0) {
      this.ticketingData[value] = quantity; 
    } else {
      delete this.ticketingData[value];
    }
    this.calculateTotal();
  }

  calculateTotal(): void {
    this.totalAmount = Object.entries(this.ticketingData).reduce(
      (total, [value, quantity]) => total + parseInt(value, 10) * quantity,
      0
    );
  }

  submitBilletage(): void {
    this.billetageData.emit({
      totalAmount: this.totalAmount,
      ticketingData: this.ticketingData
    });
  }
}
