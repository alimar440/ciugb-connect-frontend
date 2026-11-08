# CIUGB Connect

Frontend Angular 19 standalone pour les 72h du Club Informatique de l’Université Gaston Berger. Interface française, responsive, noire et rouge, avec Tailwind CSS 3, SCSS, Lucide, Signals, formulaires réactifs et routes chargées à la demande.

## Démarrer

```powershell
cd ciugb-connect
npm.cmd install --cache .angular/cache/npm
npm.cmd start
```

Ouvrir http://localhost:4200. `npm.cmd` permet de lancer npm sous PowerShell sans modifier la politique d’exécution des scripts.

## Pages

Le bouton soleil / lune dans l’en-tête permet de choisir le mode clair ou sombre sur ordinateur et mobile. Le choix est mémorisé sous `ciugb-theme`. Sans choix enregistré, la préférence système est utilisée au premier chargement. Les logos de l’en-tête et du pied de page suivent le thème ; la carte membre et les documents téléchargés gardent leur identité noire et rouge.

| Route | Fonction |
| --- | --- |
| `/` | Accueil, présentation des deux offres et des 72h |
| `/cinema` | Informations pratiques et sélection de la formule / quantité |
| `/adhesion` | Avantages, validité annuelle et aperçu de carte |
| `/commander?offre=membership` | Adhésion individuelle à 1 000 FCFA |
| `/commander?offre=ticket&quantite=3` | Tickets à 500 FCFA chacun, un QR par ticket |
| `/mes-billets` | Achats de ce navigateur, QR et téléchargements PDF, PNG ou SVG |
| `/scan` | Contrôle des 72h par saisie de code, caméra ou image QR |
| `/admin` | Chiffres simulés, filtres et configuration de la soirée cinéma des 72h |

## Règles de la carte annuelle

« 1 000 FCFA. Une année entière d'avantages. »

- Adhésion individuelle, avec un identifiant QR personnel opaque (UUID).
- Entrée gratuite à tous les événements du club pendant la validité de la carte, y compris la soirée cinéma des 72h.
- Un popcorn offert uniquement à cette soirée. Le retrait est indépendant de l’entrée : il peut être enregistré avant ou après celle-ci, une seule fois.
- Champs TypeScript : `membershipStartDate`, `membershipEndDate`, `membershipStatus`.
- La date de l’événement détermine les droits. Les bornes de validité sont incluses ; les cartes expirées, suspendues ou pas encore actives sont refusées.
- Une carte ne peut enregistrer qu’une entrée par événement, mais reste utilisable aux autres événements pendant sa validité.
- Un ticket ne donne accès qu’à son événement, une seule fois, sans popcorn inclus.

L’année universitaire **2026–2027**, du **1er octobre 2026 au 31 juillet 2027**, est une hypothèse de démonstration. Une adhésion en cours d’année commence le jour de l’achat et finit à la clôture de cette année ; elle ne glisse pas sur douze mois. La campagne est fermée après cette clôture.

La date officielle de la soirée cinéma, l’horaire, la salle, la programmation, les réseaux sociaux et les éléments de marque officiels restent à confirmer. L’illustration cinéma et la signature typographique sont des créations de présentation, sans affiche de film tierce.

## Tester les scénarios

Dans `/scan`, le contrôle est dédié à la soirée cinéma des 72h. Utiliser les boutons d’exemple :

| Identifiant | Scénario initial |
| --- | --- |
| `demo-member` | Carte valide pendant l’année 2026–2027 |
| `demo-expired` | Carte de l’année précédente, expirée |
| `demo-ticket` | Ticket cinéma disponible |
| `demo-used` | Ticket cinéma déjà utilisé |
| `demo-unknown` | Identifiant inconnu |

La soirée cinéma utilise le **12 décembre 2026** comme date de contrôle fictive, jamais comme calendrier officiel. L’admin n’affiche que les achats et validations rattachés aux 72h, ainsi que les adhésions vendues sur cette plateforme.

Deux modes de consultation sont disponibles :

- **Saisir un code** : code `T-…` affiché sur chaque ticket, numéro de membre `CI-…`, ou identifiant complet contenu dans le QR. La saisie est insensible à la casse. Une référence de commande collective ne permet pas de valider plusieurs participants d’un coup.
- **Scanner un QR code** : activer la caméra (autorisation demandée au clic) ou sélectionner une image PNG, JPEG, WebP ou SVG. La lecture est locale avec jsQR ; aucune image n’est envoyée à un serveur. La caméra s’arrête après reconnaissance, fermeture du lecteur, changement de page ou passage en arrière-plan. HTTPS ou localhost est nécessaire pour la caméra ; la saisie manuelle et l’import d’image restent disponibles en cas de refus.

La consultation affiche le résultat ; l’organisateur valide ensuite explicitement l’entrée ou le popcorn. Les deux modes utilisent le même identifiant et les mêmes protections contre les doubles validations.

Les retraits, entrées, achats et changements de capacité / date de simulation sont enregistrés dans LocalStorage sous `ciugb-connect-demo-v1`. Les quatre commandes d’exemple apparaissent dans l’admin, pas dans « Mes billets ». Pour réinitialiser la démo, supprimer uniquement cette clé dans les outils du navigateur, puis recharger.

## Vérification

```powershell
npm.cmd run build
$env:CHROME_BIN = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd test -- --watch=false --browsers=ChromeHeadless
```

Pour les tests de parcours, démarrer l’application sur `http://127.0.0.1:4200`, puis, dans un second terminal :

```powershell
npm.cmd run test:e2e -- --workers=2
```

Playwright utilise Chrome installé localement, avec des profils ordinateur et mobile. Les captures sont écrites dans `artifacts/`, les traces d’échec dans `test-results/` (dossiers ignorés par Git). L’émulation mobile ne remplace pas une validation sur téléphone réel.

Les tests couvrent notamment les bornes de validité, l’expiration à un autre événement, les doubles validations, l’indépendance du popcorn, les quantités, les identifiants uniques, la persistance, les erreurs de stockage, les formulaires et le téléchargement.

## Architecture et passage à une API

- `models/domain.ts` : Event, Ticket, Member, Membership, Order, Payment, CheckIn et PopcornRedemption.
- `core/catalog.ts` : année universitaire, prix, avantages et événements de démonstration.
- `core/membership-rules.ts` : fonctions de décision sans dépendance à Angular ni au stockage.
- `core/demo-data.ts` : exemples cohérents de départ.
- `services/club-store.service.ts` : façade Signals ; seule porte d’écriture pour les achats, entrées et retraits. Remplacer ses opérations de stockage par une API pour connecter le frontend.
- `services/download.service.ts` : export PDF (page paysage 104 × 65 mm), PNG haute résolution (2080 × 1300) ou SVG vectoriel. Tous utilisent la même composition, le logo embarqué et le QR personnel. La bibliothèque PDF est chargée uniquement lors d’un export PDF. Aucun document n’est envoyé à un serveur.
- `shared/` : icônes sélectionnées, avantages, QR, carte et affichage des justificatifs.
- `features/` : pages standalone chargées en lazy loading.

Les endpoints futurs devront gérer les paiements réels, l’identité des organisateurs, les rôles et les opérations atomiques de contrôle. Les règles d’autorisation doivent alors être exécutées côté serveur.

## Limites explicites

Aucun backend, aucun débit Wave / Orange Money, aucun email envoyé. Les QR sont réellement générés et lus par caméra ou image, mais les droits d’accès sont simulés localement : aucun QR n’est signé ou validé par un serveur. Le stockage est propre à ce navigateur, modifiable et non synchronisé. `/admin` et `/scan` sont volontairement accessibles sans authentification et signalés comme démonstrations. La caméra a été testée avec un flux vidéo synthétique dans Chrome ; son fonctionnement sur un téléphone réel reste à confirmer.

Références d’intégration : [Tailwind CSS 3 avec Angular](https://v3.tailwindcss.com/docs/guides/angular), [Lucide Angular](https://v0.lucide.dev/guide/packages/lucide-angular), [jsQR](https://github.com/cozmo/jsQR), [accès caméra](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia). Les versions Angular existantes ont été conservées.
