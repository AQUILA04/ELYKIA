/**
 * Script de test pour vérifier la gestion d'erreur améliorée
 * 
 * Ce script peut être exécuté dans la console du navigateur
 * pour tester différents scénarios d'erreur
 */

// Simuler différents types d'erreur pour tester notre système
const testErrorHandling = () => {
  console.log('🧪 Test de la gestion d\'erreur améliorée');
  
  // Test 1: Erreur avec message du backend
  const backendError = {
    status: 400,
    error: {
      message: "Le client a déjà un crédit en cours. Impossible de créer un nouveau crédit.",
      code: "CREDIT_ALREADY_EXISTS",
      statusCode: 400
    }
  };
  
  console.log('📝 Test 1 - Erreur backend avec message:');
  console.log('Message extrait:', extractErrorMessage(backendError));
  
  // Test 2: Erreur avec message string direct
  const stringError = {
    status: 500,
    error: "Erreur interne du serveur"
  };
  
  console.log('📝 Test 2 - Erreur string directe:');
  console.log('Message extrait:', extractErrorMessage(stringError));
  
  // Test 3: Erreur réseau
  const networkError = {
    status: 0,
    error: new ErrorEvent('Network Error', {
      message: 'Impossible de contacter le serveur'
    })
  };
  
  console.log('📝 Test 3 - Erreur réseau:');
  console.log('Message extrait:', extractErrorMessage(networkError));
  
  // Test 4: Erreur HTTP standard
  const httpError = {
    status: 404,
    statusText: 'Not Found'
  };
  
  console.log('📝 Test 4 - Erreur HTTP standard:');
  console.log('Message extrait:', extractErrorMessage(httpError));
  
  console.log('✅ Tests terminés');
};

// Fonction simplifiée pour extraire le message d'erreur (basée sur notre service)
const extractErrorMessage = (error) => {
  let message = 'Une erreur inattendue s\'est produite.';
  
  // Cas 1: Erreur avec structure API standard
  if (error?.error?.message) {
    message = error.error.message;
  }
  // Cas 2: Erreur avec message direct dans error.error (string)
  else if (error?.error && typeof error.error === 'string') {
    message = error.error;
  }
  // Cas 3: Erreur avec message dans error.message
  else if (error?.message) {
    message = error.message;
  }
  // Cas 4: Erreur côté client (réseau, etc.)
  else if (error?.error instanceof ErrorEvent) {
    message = error.error.message || 'Erreur de connexion';
  }
  // Cas 5: Erreurs HTTP standard basées sur le code de statut
  else {
    switch (error?.status) {
      case 400:
        message = 'Données invalides. Veuillez vérifier votre saisie.';
        break;
      case 401:
        message = 'Session expirée. Veuillez vous reconnecter.';
        break;
      case 403:
        message = 'Vous n\'avez pas les permissions nécessaires pour cette opération.';
        break;
      case 404:
        message = 'Ressource non trouvée.';
        break;
      case 409:
        message = 'Conflit de données. L\'opération ne peut pas être effectuée.';
        break;
      case 422:
        message = 'Données non valides. Veuillez corriger les erreurs et réessayer.';
        break;
      case 500:
        message = 'Erreur serveur interne. Veuillez réessayer plus tard.';
        break;
      case 0:
        message = 'Erreur de connexion. Vérifiez votre connexion internet.';
        break;
      default:
        if (error?.status >= 500) {
          message = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else if (error?.status >= 400) {
          message = 'Erreur de requête. Veuillez vérifier vos données.';
        }
    }
  }
  
  return message;
};

// Fonction pour tester avec de vraies erreurs HTTP
const testWithRealAPI = () => {
  console.log('🌐 Test avec de vraies requêtes API');
  
  // Test avec une URL qui n'existe pas (404)
  fetch('/api/nonexistent')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .catch(error => {
      console.log('📝 Erreur 404 réelle:');
      console.log('Message:', error.message);
    });
  
  // Test avec une requête malformée
  fetch('/api/credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invalid: 'data' })
  })
    .then(response => response.json())
    .catch(error => {
      console.log('📝 Erreur de requête malformée:');
      console.log('Message:', extractErrorMessage(error));
    });
};

// Exporter les fonctions pour utilisation dans la console
if (typeof window !== 'undefined') {
  window.testErrorHandling = testErrorHandling;
  window.testWithRealAPI = testWithRealAPI;
  window.extractErrorMessage = extractErrorMessage;
  
  console.log('🚀 Fonctions de test disponibles:');
  console.log('- testErrorHandling() : Teste différents types d\'erreur');
  console.log('- testWithRealAPI() : Teste avec de vraies requêtes');
  console.log('- extractErrorMessage(error) : Extrait le message d\'une erreur');
}

// Exemples d'utilisation dans les composants Angular
const angularExamples = `
// ===== EXEMPLES D'UTILISATION DANS LES COMPOSANTS =====

// 1. Composant avec ErrorHandlingMixin
export class MonComponent extends ErrorHandlingMixin implements OnInit {
  constructor(
    private monService: MonService,
    errorHandler: ErrorHandlerService
  ) {
    super(errorHandler);
  }

  loadData(): void {
    this.monService.getData().subscribe({
      next: (data) => {
        console.log('Données reçues:', data);
      },
      error: (error) => {
        // Affiche automatiquement le message complet du backend
        this.handleError(error, 'Erreur de chargement');
      }
    });
  }
}

// 2. Service avec BaseHttpService
export class MonService extends BaseHttpService {
  constructor(
    http: HttpClient, 
    tokenStorage: TokenStorageService,
    errorHandler: ErrorHandlerService
  ) {
    super(http, tokenStorage, errorHandler);
  }

  getData(): Observable<any> {
    // Gestion d'erreur automatique
    return this.get('/api/data');
  }
}

// 3. Gestion d'erreur manuelle
this.service.saveData(data).subscribe({
  next: (response) => {
    this.alertService.showSuccess('Données sauvegardées');
  },
  error: (error) => {
    // Récupère le message complet du backend
    const message = this.errorHandler.getErrorMessage(error);
    console.error('Erreur détaillée:', message);
    
    // Ou affiche directement
    this.errorHandler.showError(error, 'Erreur de sauvegarde');
  }
});
`;

console.log(angularExamples);