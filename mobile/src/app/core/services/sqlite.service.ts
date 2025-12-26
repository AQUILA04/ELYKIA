import {Component, Injectable, OnInit} from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { JeepSqlite } from 'jeep-sqlite/dist/components/jeep-sqlite';

@Injectable({
  providedIn: 'root'
})
export class SqliteService {
  async initializePlugin(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      const jeepSqlite = new JeepSqlite();
      document.body.appendChild(jeepSqlite);
      await customElements.whenDefined('jeep-sqlite');
    }
    // Ici vous pouvez ajouter d'autres initialisations SQLite
  }
}
