# Solution Complète avec Leaflet.js, Google Maps et Capacitor Browser

Voici une solution complète qui combine :
1. Une prévisualisation interactive avec Leaflet.js et OpenStreetMap
2. L'ouverture dans Google Maps via Capacitor Browser
3. Une gestion propre de la navigation entre l'application et le navigateur

## Installation des dépendances

```bash
npm install leaflet @types/leaflet @capacitor/browser
ionic cap sync
```

## Configuration de Leaflet

Ajoutez le CSS de Leaflet dans `angular.json` :

```json
"styles": [
  "node_modules/leaflet/dist/leaflet.css",
  "src/theme/variables.css",
  "src/global.scss"
]
```

## Création d'un composant MapPreview

`map-preview.component.ts` :
```typescript
import { Component, Input, AfterViewInit, ElementRef } from '@angular/core';
import * as L from 'leaflet';
import { Browser } from '@capacitor/browser';

@Component({
  selector: 'app-map-preview',
  template: `<div class="map-container"></div>`,
  styles: [`
    .map-container {
      height: 200px;
      width: 100%;
      border-radius: 8px;
      cursor: pointer;
    }
  `]
})
export class MapPreviewComponent implements AfterViewInit {
  @Input() lat!: number;
  @Input() lng!: number;
  @Input() zoom: number = 15;
  private map!: L.Map;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    this.initMap();
  }

  private initMap() {
    const container = this.elementRef.nativeElement.querySelector('.map-container');
    
    this.map = L.map(container).setView([this.lat, this.lng], this.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    L.marker([this.lat, this.lng]).addTo(this.map)
      .bindPopup('Localisation du client');

    this.map.on('click', () => this.openInGoogleMaps());
  }

  private async openInGoogleMaps() {
    const url = `https://www.google.com/maps/search/?api=1&query=${this.lat},${this.lng}`;
    
    // Ouvrir avec Capacitor Browser
    await Browser.open({ 
      url,
      presentationStyle: 'popover', // Pour iOS
      toolbarColor: '#3880ff' // Couleur de la toolbar
    });
    
    // Écouter l'événement de retour
    Browser.addListener('browserFinished', () => {
      console.log('Retour à l\'application');
    });
  }
}
```

## Utilisation du composant

Dans votre page :
```html
<ion-content>
  <!-- Autres éléments de votre interface -->
  
  <app-map-preview 
    [lat]="client.latitude" 
    [lng]="client.longitude">
  </app-map-preview>
  
  <!-- Autres éléments -->
</ion-content>
```

## Gestion de la navigation avec Capacitor Browser

La solution utilise `Capacitor Browser` qui offre plusieurs avantages :

1. **Retour à l'application possible** :
  - Sur Android : Le bouton retour standard ramène à l'application
  - Sur iOS : Une toolbar avec bouton de fermeture est affichée

2. **Style personnalisable** :
   ```typescript
   await Browser.open({
     url,
     presentationStyle: 'popover', // ou 'fullscreen'
     toolbarColor: '#3880ff' // Couleur de la toolbar (iOS)
   });
   ```

3. **Écouteur d'événements** :
   ```typescript
   Browser.addListener('browserFinished', () => {
     // Code à exécuter au retour dans l'app
     this.showToast('Vous êtes de retour dans l\'application');
   });
   ```

## Alternative avec Deep Links (pour une meilleure intégration)

Si vous voulez une expérience encore plus fluide, vous pouvez utiliser des Deep Links :

1. Configurer les Deep Links dans votre app :
  - Pour Android : Modifier `AndroidManifest.xml`
  - Pour iOS : Configurer `Associated Domains`

2. Modifier l'URL pour utiliser un schéma d'app :
   ```typescript
   const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
   const appUrl = `comgooglemaps://?q=${lat},${lng}`;
   
   // Essayer d'ouvrir dans l'app Google Maps
   try {
     await Browser.open({ url: appUrl });
   } catch {
     // Fallback sur le navigateur web
     await Browser.open({ url });
   }
   ```

## Conclusion

Cette solution offre :
- Une prévisualisation interactive gratuite avec Leaflet/OpenStreetMap
- Une ouverture optimisée dans Google Maps
- La possibilité de revenir à l'application grâce à Capacitor Browser
- Une expérience utilisateur fluide sur les deux plateformes

Le retour à l'application est bien possible :
- Via le bouton retour sur Android
- Via le bouton de fermeture dans la toolbar sur iOS
- Via les événements de Capacitor Browser pour détecter le retour
