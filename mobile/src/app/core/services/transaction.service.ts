import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DatabaseService } from './database.service';
import { Transaction } from '../../models/transaction.model';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../store/auth/auth.selectors';

import { TransactionRepository } from '../repositories/transaction.repository';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private commercialUsername: string | undefined;

  constructor(private dbService: DatabaseService,
    private store: Store,
    private transactionRepository: TransactionRepository
  ) {
    this.store.select(selectAuthUser).subscribe(user => {
      this.commercialUsername = user?.username;
    });
  }

  initializeTransactions(): Observable<Transaction[]> {
    if (!this.commercialUsername) {
      console.error('Transaction service: Commercial username not available for initialization.');
      return of([]);
    }
    return from(this.dbService.getTransactions(this.commercialUsername)).pipe(
      map(transactions => {
        if (transactions && transactions.length > 0) {
          return transactions;
        } else {
          return [];
        }
      }),
      catchError(err => {
        console.error('Transaction initialization failed:', err);
        return of([]); // Return an empty array on final failure
      })
    );
  }

  async addTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
    console.log('[SERVICE] addTransaction: Adding', transaction);
    const fullTransaction: Transaction = {
      id: `trans-${transaction.referenceId}`,
      ...transaction,
      isSync: false,
      isLocal: true,
      date: transaction.date || new Date().toISOString(),
    } as Transaction;

    await this.dbService.addTransaction(fullTransaction);
    return fullTransaction;
  }

  getTransactionsByClientPaginated(clientId: string, page: number, size: number): Observable<Transaction[]> {
    const offset = page * size;
    return from(this.transactionRepository.findTransactionsByClientPaginated(clientId, offset, size));
  }
}
