# Accessibilité (A11y) - Module de Gestion des Stocks ELYKIA

Ce document définit les règles d'accessibilité à respecter pour le module mobile de gestion des stocks.

## 1. Zones de Clic (Touch Targets)

*   Toutes les zones cliquables (boutons, liens, icônes interactives) doivent avoir une taille minimale de **44x44px** pour faciliter l'utilisation au pouce sur mobile.
*   Utilisez des marges ou des paddings suffisants autour des éléments interactifs pour éviter les clics accidentels.

## 2. Contraste des Couleurs

*   Assurez un contraste minimum de **4.5:1** pour le texte normal et de **3:1** pour le texte de grande taille (H1, H2) par rapport à l'arrière-plan.
*   Vérifiez particulièrement le contraste des badges de statut (texte foncé sur fond clair).

## 3. Utilisation des Icônes

*   **Ne jamais utiliser d'emojis** pour représenter des icônes ou des actions.
*   Privilégiez les SVG (Ionicons ou Lucide) qui sont redimensionnables et peuvent être stylisés via CSS.
*   Assurez-vous que les icônes importantes (ex: poubelle pour supprimer) sont accompagnées d'un texte alternatif ou d'un aria-label si elles sont utilisées seules comme boutons.

## 4. Gestion des Formulaires

*   Associez toujours un `<label>` ou un `<ion-label>` à chaque champ de saisie (`<input>`, `<ion-input>`, `<ion-datetime>`).
*   Utilisez les attributs `inputmode` appropriés pour optimiser le clavier virtuel (ex: `inputmode="numeric"` pour les quantités).
*   Affichez les messages d'erreur de validation de manière claire et explicite, en utilisant la couleur d'erreur (`--ion-color-danger`) et en les associant au champ concerné via `aria-describedby`.

## 5. Gestion du Focus et de la Navigation

*   Gérez correctement le focus lors de l'ouverture de modales ou de bottom sheets (le focus doit être déplacé vers le premier élément interactif de la modale).
*   Assurez-vous que l'utilisateur peut fermer les modales et les alertes via le clavier (touche Échap) ou un bouton de fermeture explicite.
*   Utilisez des rôles ARIA appropriés (ex: `role="alert"`, `role="dialog"`) pour les composants dynamiques.
