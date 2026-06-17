import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CustomerApiService } from '../../services/customer-api.service';
import { Article } from '../../../../models/article.model';
/** Page Catalogue Produits — S-09. @author Francis AHONSU */
@Component({ selector: 'app-customer-catalog', standalone: true, imports: [CommonModule, IonicModule, RouterModule], template: `<ion-header><ion-toolbar color="primary"><ion-title>Nouvelle Commande</ion-title><ion-buttons slot="end"><ion-button routerLink="/customer/cart"><ion-icon name="cart-outline"></ion-icon></ion-button></ion-buttons></ion-toolbar></ion-header><ion-content><ion-searchbar placeholder="Rechercher un produit..." (ionInput)="onSearch($event)"></ion-searchbar><ion-grid><ion-row><ion-col size="6" *ngFor="let article of articles"><ion-card><ion-card-header><ion-card-title>{{ article.name }}</ion-card-title></ion-card-header><ion-card-content><p class="price">{{ article.creditSalePrice | number:'1.0-0' }} FCFA</p><ion-button expand="block" size="small" (click)="addToCart(article)">+</ion-button></ion-card-content></ion-card></ion-col></ion-row></ion-grid></ion-content>` })
export class CustomerCatalogPage implements OnInit {
  articles: Article[] = [];
  constructor(private apiService: CustomerApiService) {}
  ngOnInit(): void { this.apiService.getArticles().subscribe(a => this.articles = a); }
  onSearch(e: any): void { this.apiService.getArticles(e.target.value).subscribe(a => this.articles = a); }
  addToCart(article: Article): void { /* TODO: NgRx cart action */ }
}
