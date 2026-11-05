---
name: Alerte contrainte SQL
overview: Ajouter une alerte Grafana Loki sur les violations d'intégrité Postgres du backend de production, routée comme les alertes métier déjà reçues par e-mail.
todos:
  - id: verify-loki
    content: Vérifier dans Loki que les lignes « violates check constraint » du 5 novembre sont bien indexées sur elykia-backend
    status: completed
  - id: rule-common-infra
    content: Ajouter la règle dans optimize-common-infra et la recopier dans la copie historique ELYKIA
    status: completed
  - id: deploy-grafana
    content: Pousser common-infra puis install.sh --force-update grafana sur Contabo
    status: completed
isProject: false
---

# Alerte Grafana sur les violations de contrainte

## Pourquoi rien n'est parti

Les e-mails actuels (échec de crédit, rupture de stock, backend injoignable) lisent des compteurs Prometheus déclarés dans `BusinessMetricsPublisher`, ou `up{job="elykia-backend"}`. Une contrainte SQL n'incrémente aucun de ces compteurs. Hibernate écrit seulement une ligne `ERROR` (`violates check constraint`), déjà collectée par Promtail.

Grafana de production est `https://grafana.optimizesolux.com`. Les règles chargées sont dans [optimize-common-infra/deploy/observability/grafana/alerting/alertrules.yml](../../../optimize-common-infra/deploy/observability/grafana/alerting/alertrules.yml). La copie [deploy/monitoring/grafana/alerting/alertrules.yml](deploy/monitoring/grafana/alerting/alertrules.yml) est l'historique DigitalOcean : la modifier seule ne notifie pas Contabo.

La politique [policies.yml](../../../optimize-common-infra/deploy/observability/grafana/alerting/policies.yml) envoie tout le dossier `ELYKIA` au contact `Email Admins`. Une règle dans ce dossier part sur le même canal, sans nouveau contact.

## Règle

Une seule règle, dossier `ELYKIA`, datasource `loki`, sévérité `critical`, équipe `tech`.

Sélecteur : conteneur `elykia-backend` uniquement (pas le backend de test).

Motifs, sur 5 minutes :

- `violates check constraint`
- `violates foreign key constraint`
- `duplicate key value violates unique constraint`

La condition est un `count_over_time` supérieur à 0, tenue 1 minute. `noDataState: OK` : l'absence de ligne n'est pas une panne. Le résumé indique qu'une contrainte Postgres a été violée et renvoie vers Explore Loki avec le même sélecteur.

Pas d'alerte sur tous les `ERROR`. Les logs contiennent déjà des contrôles introuvables, des images illisibles et des connexions coupées. Pas d'alerte HTTP 5xx dans ce lot : elle se déclencherait sur ce bruit.

## Mise en service

1. Contrôler dans Loki que les erreurs du 5 novembre (membre 276, `app_notification_type_check`) sont présentes avec le label `container=elykia-backend`. Si le label diffère, ajuster le sélecteur avant d'écrire la règle.
2. Ajouter la règle dans common-infra, et la même règle dans la copie ELYKIA pour que les deux fichiers ne divergent pas.
3. Commit et push de common-infra, puis sur le VPS `install.sh --force-update grafana`. Le dépôt d'abord, le serveur ensuite.
4. Vérifier dans Grafana que la règle est dans le dossier Elykia et que l'évaluation ne part pas en erreur de requête.
