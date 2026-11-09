# Cahier des charges backend — CIUGB Connect

**Document de passation — 9 novembre 2026**

Ce document décrit le backend à réaliser pour la billetterie de la soirée cinéma des 72h du Club Informatique de l’Université Gaston Berger, à Saint-Louis. Il peut être transmis directement à la personne chargée du développement backend.

## 1. Projet et état actuel

- Frontend : Angular 19, TypeScript strict, composants standalone, Angular Router et Signals.
- Dépôt GitHub : https://github.com/alimar440/ciugb-connect-frontend
- Adresse du frontend : https://ciugb-connect-frontend.vercel.app/
- Hébergement actuel : Vercel.
- Pages concernées : `/commander`, `/mes-billets`, `/admin` et `/scan`.
- Formats de téléchargement déjà prévus côté frontend : PDF, PNG et SVG.

Une première implémentation backend et un schéma SQL existent dans le dossier local, mais **ils constituent une base de travail à reprendre et à vérifier, pas un backend de production livré**. Des tests ont été exécutés sur une base PostgreSQL locale dédiée. Aucune base de production n’a été provisionnée dans le cadre de ce travail.

La dernière vérification de production a révélé une erreur `FUNCTION_INVOCATION_FAILED` sur l’API Vercel. Une correction locale de packaging Node existe, mais sa publication n’a pas été finalisée. Le contenu local peut donc être plus récent que le dépôt distant. Vérifier la version reçue avant de commencer.

Fichiers utiles dans la version locale :

| Fichier / dossier | Rôle |
| --- | --- |
| `src/app/models/domain.ts` | Contrats TypeScript attendus par le frontend |
| `src/app/services/club-store.service.ts` | Appels API, état des réservations et démonstration locale |
| `src/app/core/reservation-rules.ts` | Validation des données et règles locales |
| `src/app/services/download.service.ts` | Vérification du droit au téléchargement puis génération PDF/PNG/SVG |
| `src/app/core/credential-artwork.ts` | Composition visuelle du billet exporté |
| `server/handler.ts` | Première implémentation de l’API |
| `server/handler.test.ts` | Tests d’intégration PostgreSQL existants |
| `database/schema.sql` | Schéma SQL initial |
| `api/handler.js`, `scripts/build-api.mjs` | Correctif local de packaging Node pour Vercel |
| `vercel.json`, `.env.example` | Routage et variables serveur prévues |

La stack backend peut être adaptée. Le point essentiel est de **respecter les règles métier et les contrats HTTP ci-dessous**, ou de coordonner toute modification avec le frontend.

## 2. Objectif métier

Le site enregistre les réservations. Le club contacte ensuite les participants pour recevoir le paiement hors du site. Un organisateur confirme manuellement la réception du paiement. Le participant peut alors consulter et télécharger son billet et son QR code.

Parcours attendu :

```text
Nom complet + téléphone + quantité
                 ↓
       Réservation enregistrée
       Statut : pending_payment
       Aucun billet / aucun QR
                 ↓
     Le club contacte le participant
                 ↓
      Le club reçoit le paiement
                 ↓
   Un organisateur confirme le paiement
                 ↓
          Statut : validated
      Un billet individuel par place
                 ↓
  Consultation + téléchargement PDF / PNG
                 ↓
      Contrôle du code ou du QR
                 ↓
        Une seule entrée par billet
```

### Périmètre à respecter

- Uniquement la soirée cinéma des **72h du Club Informatique**.
- **Aucune carte membre, aucune adhésion annuelle.**
- **Aucune API de paiement**, aucun paiement automatique sur le site.
- Pas de demande de PIN, OTP ou données bancaires.
- Données personnelles demandées au participant : **nom complet et téléphone uniquement**.
- Pas d’adresse email, numéro étudiant, date de naissance ou adresse postale.
- Quantité : de **1 à 10 places** par réservation.
- Tarif de départ : **500 FCFA par place**, configurable côté serveur.
- Capacité initiale de travail : **120 places**, configurable et à confirmer par le club.
- Film, date, horaire et salle : à confirmer. Ne pas inventer de programmation officielle.
- Pas de droit particulier au popcorn ; le suivi popcorn de l’ancienne offre membre est hors périmètre.
- Aucun appel, SMS ou message WhatsApp n’est envoyé automatiquement dans cette version. L’organisateur utilise les coordonnées et liens de contact affichés.

## 3. Règles métier détaillées

### 3.1 Enregistrement

Le serveur valide et normalise les données. Il calcule le montant à partir du tarif enregistré en base ; il ne fait jamais confiance à un montant fourni par le navigateur.

À la création :

- Statut obligatoire : `pending_payment`.
- Génération d’un identifiant interne et d’un code privé de consultation.
- Conservation du nom, du téléphone, de la quantité, du montant et de la date de réservation.
- `validatedAt = null`.
- `contactedAt = null`.
- `tickets = []` dans la réponse publique.
- Aucun QR, aucun code de billet, aucun justificatif donnant accès à la soirée.

### 3.2 Contact

L’organisateur peut consulter les coordonnées, appeler le participant ou ouvrir WhatsApp. Une action « Marquer contacté » renseigne `contactedAt`.

**Marquer un participant comme contacté ne confirme pas le paiement et ne débloque aucun billet.**

### 3.3 Validation du paiement

Une action réservée à un organisateur authentifié confirme que le club a reçu le montant dû.

Le frontend présente déjà une confirmation explicite avant cet appel : « Le club a-t-il bien reçu le montant ? ».

Dans une seule transaction :

1. Verrouiller la réservation.
2. Refuser si elle est annulée.
3. Si elle est déjà validée, retourner un succès sans recréer de billet.
4. Créer exactement autant de billets que de places réservées.
5. Donner à chaque billet un identifiant QR et un code de saisie uniques.
6. Renseigner `validatedAt` et passer le statut à `validated`.
7. Enregistrer l’action dans l’historique d’administration.

Le billet doit être disponible sur tous les appareils après consultation du dossier, pas uniquement dans le navigateur de l’organisateur.

### 3.4 Annulation

- `pending_payment → cancelled` : autorisé à un organisateur.
- `validated → cancelled` : autorisé seulement si aucun billet de cette réservation n’a déjà servi.
- Une annulation libère les places réservées.
- Une réservation annulée ne peut pas être validée à nouveau dans cette version.
- Le participant voit le statut annulé, sans billet ni téléchargement.
- Un QR téléchargé avant l’annulation doit être refusé au contrôle.
- Préférer une révocation conservant l’historique des billets à une suppression sans trace.

### 3.5 Capacité

Les réservations en attente et validées occupent les places. Les réservations annulées ne les occupent plus.

```text
places restantes = capacité − somme des quantités des réservations non annulées
```

Le contrôle de capacité et la création de réservation doivent être atomiques : deux demandes simultanées ne doivent pas réserver la même dernière place.

Il n’y a **pas d’expiration automatique** des réservations en attente dans la version demandée. Le club annule manuellement les demandes abandonnées. Un mécanisme automatique éventuel devra être validé séparément.

### 3.6 Idempotence

Le navigateur fournit `requestId` pour éviter une double réservation après un double clic ou une reprise réseau.

- Même `requestId` et mêmes données : retourner la réservation déjà créée, sans doublon ni place supplémentaire.
- Même `requestId` avec des données incompatibles : retourner une erreur explicite `409`.
- Une validation de paiement répétée ne doit jamais générer de billets supplémentaires.

## 4. Statuts et transitions

### Réservation

```ts
type ReservationStatus = 'pending_payment' | 'validated' | 'cancelled';
```

| État initial | Action | État final | Billets accessibles au participant |
| --- | --- | --- | --- |
| Nouvelle demande | Enregistrer | `pending_payment` | Non |
| `pending_payment` | Marquer contacté | `pending_payment` | Non |
| `pending_payment` | Confirmer le paiement | `validated` | Oui |
| `pending_payment` | Annuler | `cancelled` | Non |
| `validated` | Confirmer à nouveau | `validated` | Oui, sans doublon |
| `validated`, aucun billet utilisé | Annuler | `cancelled` | Non, anciens QR refusés |
| `validated`, au moins un billet utilisé | Annuler | Refus `409` | État conservé |
| `cancelled` | Confirmer le paiement | Refus `409` | Non |

### Résultat de contrôle

```ts
type AccessStatus = 'valid' | 'used' | 'denied' | 'unknown';
```

- `valid` : billet existant, paiement confirmé, non révoqué et non utilisé.
- `used` : entrée déjà enregistrée, aucune seconde entrée autorisée.
- `denied` : titre connu mais accès non autorisé, notamment après révocation.
- `unknown` : code inconnu ou code de réservation présenté à la place d’un billet.

Le code de réservation doit toujours être refusé comme moyen d’entrée, quel que soit le libellé `denied` ou `unknown` retenu.

## 5. Données et schéma attendu

PostgreSQL est proposé car une première implémentation et des tests existent déjà. Une autre base est possible si elle permet les transactions, l’unicité des identifiants et les contrôles concurrents requis.

### `ciugb_event`

Configuration de la soirée unique :

| Champ | Type / règle |
| --- | --- |
| `id` | Clé primaire, une seule soirée dans cette version |
| `capacity` | Entier positif, valeur initiale 120 à confirmer |
| `ticket_price` | Entier FCFA positif, valeur initiale 500 |

La programmation officielle peut être ajoutée comme configuration, mais le frontend actuel accepte déjà les libellés « à confirmer ».

### `ciugb_reservations`

| Champ | Type / règle |
| --- | --- |
| `id` | UUID, clé primaire |
| `reference` | Code privé opaque, unique, imprévisible |
| `request_id` | UUID unique pour l’idempotence |
| `full_name` | Texte de 2 à 120 caractères, espaces normalisés |
| `phone` | Numéro de téléphone normalisé, stocké comme texte |
| `quantity` | Entier de 1 à 10 |
| `amount` | Entier FCFA, calculé côté serveur et conservé pour ce dossier |
| `status` | `pending_payment`, `validated` ou `cancelled` |
| `created_at` | Date UTC d’enregistrement |
| `contacted_at` | Date UTC, nullable |
| `validated_at` | Date UTC de confirmation, nullable |

### `ciugb_tickets`

| Champ | Type / règle |
| --- | --- |
| `id` | Identifiant opaque unique, utilisé comme contenu QR |
| `reservation_id` | Clé étrangère vers la réservation |
| `code` | Code de saisie unique, distinct du code de réservation |
| `checked_in_at` | Date UTC, nullable avant l’entrée |
| Révocation | Champ ou mécanisme interne permettant de refuser un titre annulé |

### Historique d’administration

Prévoir un journal des actions sensibles : confirmation de paiement, annulation et validation d’entrée. Enregistrer l’auteur/session organisateur, l’action, l’objet concerné et la date. Ne pas recopier inutilement le téléphone, les secrets ou les codes privés dans les logs.

### Limitation des tentatives

Prévoir un stockage partagé pour la limitation des connexions, créations de réservation et consultations. Une limite en mémoire dans une seule fonction serverless ne suffit pas pour plusieurs instances.

### Contraintes indispensables

- Unicité des références, `request_id`, identifiants et codes de billet.
- Index sur le statut, la date de réservation et les clés étrangères.
- Dates stockées en UTC et renvoyées au format ISO 8601.
- Montants en entiers FCFA, sans calcul flottant.
- Aucun accès direct des navigateurs aux tables contenant les coordonnées.
- Si le fournisseur expose une API de base de données, activer les restrictions appropriées, notamment RLS sur Supabase ; aucun droit public de lecture/écriture sur les dossiers.

## 6. Contrats JSON compatibles avec Angular

Respecter les noms de propriétés en `camelCase` dans les réponses HTTP, même si les colonnes SQL sont en `snake_case`.

```ts
interface Ticket {
  id: string;
  code: string;
  checkedInAt: string | null;
}

interface Reservation {
  id: string;
  reference: string;
  fullName: string;
  phone: string;
  quantity: number;
  amount: number;
  status: 'pending_payment' | 'validated' | 'cancelled';
  createdAt: string;
  validatedAt: string | null;
  contactedAt: string | null;
  tickets: Ticket[];
}

interface ReservationInput {
  fullName: string;
  phone: string;
  quantity: number;
  requestId: string;
}

interface AccessResult {
  status: 'valid' | 'used' | 'denied' | 'unknown';
  title: string;
  detail: string;
  fullName?: string;
  ticketCode?: string;
  ticketId?: string;
}
```

Une réservation en attente ou annulée doit toujours renvoyer `tickets: []` dans la consultation publique. Il ne suffit pas de masquer le QR en CSS.

## 7. Endpoints publics

Préfixe attendu : `/api`. Toutes les réponses doivent être du JSON, y compris les erreurs. Les réponses contenant des dossiers doivent être non mises en cache (`Cache-Control: no-store`).

### `GET /api/config`

Décrit l’ouverture des réservations et la soirée.

```json
{
  "configured": true,
  "event": {
    "name": "Soirée cinéma des 72h",
    "dateLabel": "Date et horaire à confirmer",
    "location": "Campus UGB, Saint-Louis · salle à confirmer",
    "ticketPrice": 500,
    "capacity": 120,
    "remaining": 117
  }
}
```

Si le service n’est pas encore prêt, retourner une configuration fermée ou une erreur contrôlée. Ne jamais déclarer l’enregistrement réussi sans base persistante. Ne renvoyer aucun secret dans cette réponse.

### `POST /api/reservations`

Crée une réservation en attente.

```json
{
  "fullName": "Awa Exemple",
  "phone": "+221770000000",
  "quantity": 2,
  "requestId": "d82e39f4-885f-4d1b-8c60-a3543048d133"
}
```

Réponse `201` :

```json
{
  "id": "9f5914aa-65a4-4e54-9a52-df0c9caee8ba",
  "reference": "R-0123456789ABCDEF0123456789ABCDEF",
  "fullName": "Awa Exemple",
  "phone": "+221770000000",
  "quantity": 2,
  "amount": 1000,
  "status": "pending_payment",
  "createdAt": "2026-11-09T12:00:00.000Z",
  "validatedAt": null,
  "contactedAt": null,
  "tickets": []
}
```

Le prix, le statut et les identifiants sont décidés par le serveur. Ignorer ou refuser toute tentative de les imposer dans le corps de la requête.

### `POST /api/reservation`

Consulte un dossier à partir de son code privé :

```json
{ "reference": "R-0123456789ABCDEF0123456789ABCDEF" }
```

Réponse `200` : objet `Reservation`. Après validation, `tickets` contient un objet par place ; avant validation et après annulation, le tableau est vide.

Le code de consultation fonctionne comme un secret d’accès au dossier. Le générer avec au moins 128 bits d’aléa cryptographique. Ne pas mettre ce code dans des URL, journaux d’accès, outils d’analyse ou captures partagées. La consultation par téléphone seul n’est pas autorisée.

Limiter les tentatives et retourner une erreur sobre `404` si le code n’existe pas, sans révéler les dossiers d’autres personnes.

## 8. Authentification organisateur

**L’administration est un espace privé réservé à l’équipe du Club Informatique. Une connexion est obligatoire.** Les participants ne doivent pouvoir ni se créer un compte organisateur, ni consulter les dossiers des autres, ni valider eux-mêmes leur paiement.

### Accès attendu dans le site

1. Un membre autorisé de votre équipe ouvre `/admin` ou `/scan`.
2. S’il n’est pas connecté, seul le formulaire de connexion est affiché. Aucun tableau, nom, téléphone ou outil de validation ne doit être chargé avant authentification.
3. Après connexion réussie, l’équipe peut accéder aux réservations et aux contrôles autorisés.
4. Un bouton « Se déconnecter » ferme la session et masque immédiatement les données de l’administration.
5. À l’expiration de la session, une nouvelle connexion est exigée.

Les comptes organisateurs sont créés uniquement par un responsable du club ou par la configuration sécurisée du backend. **Aucune inscription administrateur publique, aucun identifiant ou mot de passe affiché sur le site.** Un participant conserve uniquement son code privé de réservation ; il ne reçoit aucun accès administrateur.

Le compte partagé évoqué ci-dessous est une option minimale de première version, pas un accès ouvert : votre équipe doit toujours saisir son mot de passe. Pour plusieurs organisateurs, privilégier des comptes individuels afin d’identifier qui a confirmé chaque paiement et chaque entrée. Si cette option est retenue, adapter explicitement le formulaire et le contrat de connexion.

Aucun mode démo, paramètre d’URL ou état LocalStorage ne doit permettre de contourner cette connexion. Le frontend affiche toujours le formulaire si l’API est indisponible ; aucune session ni donnée privée n’est ouverte sans authentification réussie, y compris en local.

Toutes les routes `/admin-*` et le contrôle des entrées doivent être protégés **côté serveur**. Un garde Angular ne suffit pas.

La v1 peut utiliser un compte organisateur partagé avec un mot de passe serveur fort. Des comptes individuels sont préférables si plusieurs personnes doivent être identifiées dans l’historique. Ne pas imposer de création de compte aux participants.

### `GET /api/admin-session`

```json
{ "authenticated": false }
```

### `POST /api/admin-session`

```json
{ "password": "mot-de-passe-saisi-par-organisateur" }
```

Si la connexion réussit : cookie de session protégé et réponse :

```json
{ "authenticated": true }
```

Exigences :

- Cookie `HttpOnly`, `Secure` en production et `SameSite` adapté à l’architecture.
- Durée de session limitée, par exemple huit heures.
- Secret de signature conservé côté serveur.
- Vérification de l’expiration et protection contre les sessions falsifiées.
- Limitation des tentatives et comparaison sûre des secrets.
- Protection CSRF des écritures, notamment vérification de l’origine.
- Ne pas stocker le mot de passe ni un jeton administrateur dans LocalStorage.

### `DELETE /api/admin-session`

Supprime la session/cookie et retourne :

```json
{ "ok": true }
```

La session doit être vérifiée sur chaque endpoint protégé. Après expiration, retourner `401` pour que le frontend redemande la connexion.

## 9. Endpoints organisateur

### `GET /api/admin-reservations`

Retourne un tableau d’objets `Reservation`, triés du plus récent au plus ancien. L’accès est réservé aux organisateurs.

L’interface existante filtre côté frontend par statut et recherche par nom, téléphone ou code. Elle affiche :

- Dossiers en attente de contact/paiement.
- Nombre de billets validés.
- Montants dont le paiement a été confirmé manuellement.
- Nombre d’entrées effectivement validées.

Le champ « paiements confirmés » est une somme des dossiers validés, pas une preuve bancaire automatique. Si une pagination serveur est ajoutée, convenir du nouveau contrat avec le frontend et calculer les totaux sur l’ensemble des dossiers, pas uniquement sur la page visible.

### `POST /api/admin-reservation`

Action sur un dossier :

```json
{
  "id": "9f5914aa-65a4-4e54-9a52-df0c9caee8ba",
  "action": "contact"
}
```

Actions acceptées : `contact`, `validate`, `cancel`.

Réponse `200` :

```json
{ "ok": true }
```

Le frontend recharge ensuite la liste. Les transitions, contrôles d’autorisation, créations de billets et écritures d’historique doivent être réalisées dans le backend.

### `POST /api/admin-scan`

Consultation sans consommer le billet :

```json
{ "code": "B-0123456789ABCDEF", "confirm": false }
```

Le champ `code` accepte le code lisible `B-…` ou l’identifiant opaque contenu dans le QR. Les deux correspondent au **même billet**.

Réponse valide :

```json
{
  "status": "valid",
  "title": "Billet valide",
  "detail": "Paiement confirmé par l’organisateur. Une entrée autorisée.",
  "fullName": "Awa Exemple",
  "ticketCode": "B-0123456789ABCDEF",
  "ticketId": "cd572ce6-5bc9-474d-8d2a-069ddbc21242"
}
```

Après décision de l’organisateur, consommation du billet :

```json
{ "code": "cd572ce6-5bc9-474d-8d2a-069ddbc21242", "confirm": true }
```

La mise à jour de `checked_in_at` doit être conditionnelle et atomique. Deux scans simultanés ne doivent pas accorder deux entrées. Après la première validation, les vérifications suivantes retournent `used`.

Une consultation `confirm: false` ne doit jamais enregistrer une entrée. La caméra s’occupe seulement de lire le QR ; elle ne confirme pas automatiquement le passage.

## 10. QR et téléchargements

- Le QR contient uniquement un identifiant opaque de billet généré par le serveur.
- Aucun nom, téléphone, mot de passe ou code privé de réservation dans son contenu.
- Identifiant cryptographiquement imprévisible et code lisible unique.
- Ne pas utiliser un simple compteur incrémental pour autoriser l’entrée.
- Une copie du QR reste une copie du même billet ; le serveur bloque la seconde entrée.
- Un billet révoqué doit être refusé même si le fichier a été téléchargé avant l’annulation.

Les exports PDF/PNG/SVG peuvent rester générés par Angular. Le frontend actuel recharge le dossier avant chaque téléchargement et vérifie que le billet est encore autorisé.

**Le vrai contrôle d’accès reste celui de l’API de scan.** Masquer un bouton ou signer visuellement un fichier ne sécurise pas une entrée. Si des exports sont finalement générés côté serveur, ne les servir qu’au détenteur du code privé et seulement pour une réservation validée.

## 11. Validation des entrées et réponses d’erreur

### Données

- Nom complet : chaîne de 2 à 120 caractères après normalisation ; accepter les accents, espaces, apostrophes et traits d’union.
- Téléphone : chaîne normalisée, éventuellement préfixée par `+`, contenant de 8 à 15 chiffres après suppression des séparateurs de présentation.
- Quantité : entier de 1 à 10, jamais un flottant.
- `requestId` : UUID valide.
- Codes : taille bornée ; normaliser la casse des codes lisibles et les espaces autour sans modifier leur signification.
- Limiter la taille des corps JSON et refuser les propriétés de contrôle envoyées par un participant.

Préciser avec le club si les numéros sénégalais sans indicatif doivent être convertis en `+221…`. Ne pas ajouter automatiquement cet indicatif à un numéro étranger.

### Erreur JSON commune

```json
{ "error": "Message compréhensible en français." }
```

| HTTP | Utilisation |
| --- | --- |
| `400` | Coordonnées, quantité, UUID ou action invalides |
| `401` | Session organisateur absente, expirée ou invalide |
| `403` | Origine interdite ou droits insuffisants |
| `404` | Réservation ou ressource introuvable |
| `409` | Capacité épuisée, transition interdite ou conflit d’idempotence |
| `413` | Corps de requête trop volumineux |
| `415` | Format de requête non pris en charge |
| `429` | Trop de tentatives |
| `503` | Service ou base indisponible, configuration manquante |

Ne pas renvoyer de trace technique, URL SQL, mot de passe, données d’une autre réservation ou message interne du fournisseur de base au navigateur.

## 12. Sécurité et exploitation

- HTTPS en production.
- Authentification et autorisation sur chaque opération organisateur.
- Requêtes SQL paramétrées et transactions sur les opérations critiques.
- Restriction des origines/CORS et protection CSRF adaptées aux cookies.
- Aucun secret ni identifiant de base dans le frontend ou le dépôt Git.
- Limitation des tentatives sur la connexion, la création et la consultation.
- Pas de données personnelles ni de codes d’accès dans les logs applicatifs ou d’analyse.
- Sauvegardes et procédure de restauration de la base.
- Politique de conservation des coordonnées définie avec le club, puis purge/anonymisation prévue.
- Sessions et accès organisateur révocables en cas de perte de contrôle d’un compte.
- En cas de panne, ne jamais substituer silencieusement LocalStorage à la base de production.

Le mode local du frontend est une démonstration, pas une authentification ni une preuve de paiement. Aucun bouton de validation démo ne doit être utilisé comme autorisation de production.

## 13. Déploiement et branchement Vercel

### Option privilégiée : backend dans le même projet

Exposer `/api/*` avec des fonctions Vercel et connecter une base PostgreSQL persistante. Le navigateur utilise le même domaine que le frontend, ce qui simplifie les cookies et évite une configuration CORS interdomaines.

Variables prévues par le code existant :

```dotenv
DATABASE_URL=<URL PostgreSQL privée>
ADMIN_PASSWORD=<mot de passe organisateur fort>
ADMIN_SESSION_SECRET=<secret aléatoire distinct, au moins 32 caractères>
```

Si une authentification différente est choisie, documenter les nouvelles variables et conserver les routes de session compatibles, ou adapter explicitement le frontend.

Paramètres de build frontend : Node.js 22, sortie `dist/client`. La racine du projet Vercel doit être le dossier contenant `package.json`, `vercel.json` et `api/`.

Vérifier impérativement :

1. Installation et compilation propres depuis un clone.
2. Packaging réellement exécutable dans le runtime Node Vercel, pas seulement via `tsx` en local.
3. Routage des `/api/*` vers l’API, jamais vers `index.html`.
4. Routage Angular des `/mes-billets`, `/admin`, `/scan` et autres pages après rechargement direct.
5. Configuration des variables privées sur le bon environnement Production/Preview.
6. Migration du schéma sur une base dédiée.
7. Connexion SQL adaptée au serverless : pooler fournisseur si disponible, faible nombre de connexions et paramètres TLS appropriés.
8. `GET /api/config` en production renvoie un vrai JSON et ne plante pas au démarrage.

### Option séparée : autre hébergeur backend

Possible si le développeur le préfère. Fournir alors l’URL HTTPS de l’API, adapter les URL relatives du frontend et définir les origines, cookies, credentials et protections CSRF compatibles. Ne pas laisser deux backends concurrents répondre différemment au même parcours.

## 14. Tests et critères d’acceptation

Les tests doivent utiliser une base dédiée, jamais les données de production.

### Réservation et paiement manuel

- [ ] Une demande avec seulement nom, téléphone et quantité est enregistrée en base.
- [ ] Aucun email ou autre renseignement personnel n’est obligatoire.
- [ ] Le montant envoyé par un client ne peut pas remplacer le calcul serveur.
- [ ] Après création, aucun billet, QR ou téléchargement n’est accessible.
- [ ] Marquer un contact ne débloque pas le billet.
- [ ] Une requête non authentifiée ne peut ni lister les participants ni confirmer un paiement.
- [ ] Après validation, une réservation de trois places possède exactement trois billets distincts.
- [ ] Une nouvelle validation de la même réservation ne crée aucun doublon.
- [ ] Une reprise réseau de la création ne crée pas de seconde réservation.
- [ ] Deux demandes concurrentes pour la dernière place ne dépassent pas la capacité.

### Consultation et téléchargement

- [ ] Le participant retrouve son dossier depuis un autre navigateur avec son code privé.
- [ ] Un mauvais code ne révèle aucune coordonnée.
- [ ] Les billets deviennent visibles après validation, sans dépendre du LocalStorage de l’organisateur.
- [ ] Le PNG et le PDF téléchargés contiennent le bon identifiant QR.
- [ ] Les QR extraits des fichiers téléchargés sont lisibles par le contrôle.
- [ ] Après annulation, une nouvelle consultation et un nouveau téléchargement ne donnent plus accès au billet.

### Contrôle des entrées

- [ ] La saisie du code lisible et le QR ciblent le même billet.
- [ ] Une simple vérification ne consomme pas le billet.
- [ ] La première confirmation enregistre une entrée.
- [ ] La seconde présentation est refusée comme déjà utilisée.
- [ ] Deux confirmations simultanées n’autorisent qu’une entrée.
- [ ] Un code de réservation ne permet jamais d’entrer.
- [ ] Un ancien QR d’une réservation annulée est refusé.
- [ ] Une réservation dont un billet est déjà utilisé ne peut pas être annulée.

### Livraison et production

- [ ] Sans connexion, `/admin` et `/scan` affichent uniquement la connexion, sans charger les données privées.
- [ ] Aucune inscription publique ne permet d’obtenir un compte organisateur.
- [ ] Un participant ne peut pas confirmer son paiement ni débloquer son billet lui-même.
- [ ] Connexion, expiration et déconnexion organisateur fonctionnent.
- [ ] Les routes protégées restent protégées même en appel HTTP direct.
- [ ] Le schéma, les migrations, les variables et la procédure de déploiement sont documentés.
- [ ] Aucun secret, export de participants ou base de test n’est versionné.
- [ ] La vraie version de production est testée après déploiement ; le succès du build seul ne suffit pas.
- [ ] Les réservations persistent entre deux appareils et après redéploiement.
- [ ] Un test de réservation complète avec données fictives a été effectué sur l’environnement cible.

## 15. Livrables demandés au développeur backend

1. Code source backend maintenable, dans une branche ou un dépôt identifié.
2. Contrat API respecté ou différences documentées avec adaptation du frontend.
3. Schéma et migrations reproductibles.
4. Configuration serveur et exemple de variables **sans secrets**.
5. Tests des transitions, permissions, idempotence et opérations concurrentes.
6. Instructions de lancement local et de déploiement.
7. Base persistante de production configurée sous le contrôle du club.
8. Compte/session organisateur opérationnel et procédure de renouvellement des accès.
9. Vérification du parcours complet sur l’URL réellement déployée.
10. Liste des limites restantes et des décisions nécessitant une validation du club.

### Décisions à confirmer avec le club avant ouverture

- Date, horaire, salle et film.
- Capacité réelle et maintien du tarif de 500 FCFA.
- Fournisseur et titulaire de la base de production.
- Personnes autorisées à confirmer les paiements et contrôler les entrées.
- Moyens de paiement acceptés **hors du site** et personne chargée du contact.
- Durée de conservation des noms et téléphones.

**Priorité de livraison : un parcours fiable et simple — réserver, contacter, confirmer le paiement, débloquer le billet, contrôler une entrée unique.**
