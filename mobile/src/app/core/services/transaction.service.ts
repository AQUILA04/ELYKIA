import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DatabaseService } from './database.service';
import { Transaction } from '../../models/transaction.model';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../store/auth/auth.selectors';

import { TransactionRepository } from '../repositories/transaction.repository';
import { TransactionRepositoryExtensions, TransactionRepositoryFilters } from '../repositories/transaction.repository.extensions';
import { Page } from '../repositories/repository.interface';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private commercialUsername: string | undefined;

  constructor(private dbService: DatabaseService,
    private store: Store,
    private transactionRepository: TransactionRepository,
    private transactionRepositoryExtensions: TransactionRepositoryExtensions
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
    console.warn('initializeTransactions is deprecated. Use getTransactionsPaginated instead.');
    return of([]);
  }

  async addTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
    console.log('[SERVICE] addTransaction: Adding', transaction);
    const fullTransaction: Transaction = {
      id: transaction.id || `trans-${transaction.referenceId || Date.now()}`,
      ...transaction,
      isSync: false,
      isLocal: true,
      date: transaction.date || new Date().toISOString(),
    } as Transaction;

    await this.transactionRepository.save(fullTransaction);
    return fullTransaction;
  }

  getTransactionsByClientPaginated(clientId: string, page: number, size: number): Observable<Transaction[]> {
    const offset = page * size;
    // Note: Repository method returns Promise<Transaction[]>, we wrap it in from()
    return from(this.transactionRepository.findTransactionsByClientPaginated(clientId, offset, size));
  }

  /**
   * Get paginated transactions for the current commercial
   */
  getTransactionsPaginated(page: number, size: number, filters?: TransactionRepositoryFilters): Observable<Page<Transaction>> {
    if (!this.commercialUsername) {
      return of({ content: [], totalElements: 0, totalPages: 0, page, size });
    }
    return from(this.transactionRepositoryExtensions.findByCommercialPaginated(this.commercialUsername, page, size, filters));
  }
}
