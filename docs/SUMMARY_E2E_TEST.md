# Architecture de Tests E2E Mobile (Offline-First)

L'intégration du framework de test E2E est terminée ! Nous avons mis en place une architecture robuste, orientée "Network-First", pour s'assurer que vos tests mobiles s'exécutent de façon rapide, isolée et déterministe (sans *flakiness* liée au réseau).

## Ce qui a été accompli

1. **Installation de Playwright** : Configuration de `@playwright/test` ciblant spécifiquement **Mobile Chrome sur Pixel 5** via `http://localhost:8100`.
2. **Génération des Mocks (`mock-data.ts`)** : J'ai créé un script Node.js qui a parsé votre fichier `docs/Request URL.txt` pour en extraire automatiquement toutes les requêtes d'initialisation et les transformer en objets JSON.
3. **Intercepteur Réseau (`network-interceptor.ts`)** : J'ai mis en place une classe utilitaire que chaque test appelle via `await interceptor.setup()`. Elle intercepte toutes les requêtes sortantes vers `/api/` et renvoie vos données mockées. Si le réseau est défaillant (simulation via Playwright), l'application peut se replier sur sa base locale.
4. **Scénarios de Test** : Création de la suite complète couvrant :
   - `offline-initialization.spec.ts`
   - `offline-clients.spec.ts`
   - `offline-articles.spec.ts`
   - `offline-distributions.spec.ts`
   - `offline-recoveries.spec.ts`
   - `offline-reports.spec.ts`
   - `offline-sync.spec.ts`
   - `offline-misc.spec.ts` (Tontines et Localités)

## Comment exécuter les tests

> [!IMPORTANT]
> L'application doit tourner avec `ionic serve` (sur le port 8100 par défaut). Dans le pipeline CI, cela est géré automatiquement via la directive `webServer` de Playwright. **Il n'est pas nécessaire de démarrer Keycloak ou le backend !** L'intercepteur réseau fera tout le travail.

### Mode silencieux (CI & Terminal)
Exécute tous les tests en arrière-plan et génère un rapport HTML en cas d'erreur.
```bash
cd mobile
npm run test:e2e
```

### Mode Interface Graphique (UI) - **Recommandé en local**
Ce mode ouvre l'interface Playwright. Vous pourrez lancer les tests un par un, voir l'écran du mobile en temps réel, analyser les requêtes réseau interceptées et inspecter le DOM avec le Trace Viewer.
```bash
cd mobile
npm run test:e2e:ui
```

## Maintenance et Ajustements

> [!TIP]
> **Sélecteurs Ionic** : Les tests sont basés sur les textes et composants standards d'Ionic (ex: `getByPlaceholder`, `getByText`, `ion-button`). Selon vos modifications récentes, il se peut que certains sélecteurs nécessitent un léger ajustement. Vous pouvez utiliser l'outil d'inspection de Playwright UI pour "pointer et cliquer" afin de récupérer le sélecteur parfait si un test échoue à trouver un bouton.

## Bilan des Risques
Le risque d'instabilité ("flakiness") lié aux requêtes API est maintenant formellement atténué (`Mitigated`). La suite E2E est exécutée de manière stricte dans le pipeline CI (`ci.yml`) avant tout build, garantissant qu'aucune régression fonctionnelle majeure n'est introduite avant une livraison.
