# CIUGB Connect · Soirée thriller des 72h

Billetterie du Club Informatique de l’Université Gaston Berger. Angular 19 standalone, TypeScript strict, Tailwind/SCSS, thèmes clair et sombre, logos originaux du club, QR caméra/image/code et exports PDF/PNG/SVG.

## Parcours actuel

1. Le participant indique uniquement **son nom complet, son téléphone et le nombre de places**.
2. Sa réservation est enregistrée avec le statut `pending_payment`. Aucun billet, QR ou téléchargement n’est créé.
3. L’organisateur se connecte à `/admin`, contacte le participant par téléphone ou WhatsApp, puis marque le contact s’il le souhaite.
4. Après réception du paiement hors ligne, il clique sur « Confirmer le paiement », puis confirme explicitement que le club a reçu le montant.
5. L’API crée un billet individuel par place et passe la réservation à `validated`.
6. Le participant consulte `/mes-billets`, actualise son statut ou utilise son code de réservation pour retrouver son dossier depuis un autre appareil. Il peut télécharger chaque billet en PDF, PNG haute résolution (2080 × 1300) ou SVG.
7. `/scan`, réservé à l’organisateur, accepte le code du billet, une image QR ou la caméra. Chaque billet autorise une entrée unique.

**Plus de carte membre, plus de paiement par API, plus d’email ni de numéro étudiant.** Le tarif reste à **500 FCFA par place**. Le film, la date, l’horaire et la salle restent à confirmer. Le popcorn n’est pas inclus.

Le code `R-…` est un code privé de consultation de réservation ; il ne sert pas de billet. Le code `B-…` et le QR sont créés uniquement après validation du paiement. La référence privée de réservation et le téléphone ne sont pas imprimés dans le billet ni encodés dans le QR.

## Démonstration locale

```powershell
npm.cmd ci --cache .angular/cache/npm
npm.cmd start
```

Ouvrir http://localhost:4200. Sans API, **uniquement sur localhost**, une démonstration locale est activée et clairement signalée. Ses données sont conservées sous `ciugb-reservations-demo-v2`. Les codes des réservations consultées sont mémorisés sous `ciugb-reservation-references-v2`.

L’administration et le contrôle des billets exigent une connexion, y compris en local : la démonstration ne donne pas d’accès automatique organisateur. Pour tester ces opérations, démarrer l’API configurée décrite plus bas. Le formulaire de connexion reste visible si le serveur est indisponible ; aucune session n’est simulée par le frontend.

**Sur Vercel, une API ou une base absente ne déclenche jamais une fausse réservation locale.** Le site indique que les réservations ne sont pas encore ouvertes.

## Activer la base réelle sur Vercel

Le frontend de production est relié à `https://backend-ciugb-cinema.onrender.com/api`. Les réservations, la consultation, la connexion organisateur et le scan passent directement par ce service Render avec les cookies de session (`credentials: 'include'`). Le backend autorise le domaine Vercel du projet par CORS.

Le backend est livré dans le même projet : `server/handler.ts` est précompilé par `scripts/build-api.mjs` en un module Node autonome ; `api/handler.js` sert d’entrée Vercel. La précompilation est exécutée après l’installation et avant le build. Le backend utilise PostgreSQL et ne nécessite aucun serveur à administrer séparément. Aucun compte ni base externe n’a été créé automatiquement.

1. Créer une base PostgreSQL dédiée auprès du fournisseur choisi (par exemple Neon via Vercel, ou PostgreSQL de Supabase). Préférer l’URL de connexion poolée du fournisseur et conserver ses paramètres TLS.
2. Exécuter **[database/schema.sql](database/schema.sql)** dans l’éditeur SQL de cette base. Les tables portent le préfixe `ciugb_`. Le tarif et la capacité se configurent dans `ciugb_event` (valeurs initiales : 500 FCFA, 120 places).
3. Dans **Vercel → Project Settings → Environment Variables**, définir pour Production et Preview si nécessaire :

| Variable serveur       | Valeur attendue                                                     |
| ---------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`         | URL PostgreSQL privée fournie par l’hébergeur                       |
| `ADMIN_PASSWORD`       | Mot de passe organisateur d’au moins 12 caractères                  |
| `ADMIN_SESSION_SECRET` | Secret aléatoire d’au moins 32 caractères, distinct du mot de passe |

4. Régler la **Root Directory** Vercel sur le dossier contenant `package.json`, `vercel.json` et `api/`. Si le dépôt contient le dossier parent CIUGB, ce sera `ciugb-connect`. Si le dépôt contient directement l’application, laisser la racine.
5. Utiliser Node.js 22, la commande de build `npm run build` et le dossier de sortie `dist/client`. `vercel.json` déclare ces paramètres et les routes API/SPA.
6. Pousser vers le **bon dépôt GitHub déjà relié à Vercel**, puis redéployer. Les modifications locales ne mettent pas automatiquement à jour le site déployé.
7. Vérifier `/api/config` : `configured` doit être `true`. Ouvrir `/admin` et se connecter avec le mot de passe défini côté serveur.

Les secrets ne doivent jamais être placés dans `src/`, dans une variable publique Angular ou dans Git. `.env.example` donne les noms sans secret. `.env` et `.env.*` sont ignorés par Git.

Pour appliquer le schéma depuis votre machine, créer un fichier **local et ignoré** `.env.local` contenant les variables privées, puis :

```powershell
node --env-file=.env.local scripts/migrate-db.mjs
```

## Développement avec l’API réelle

Après configuration de `.env.local` et du schéma, dans un terminal :

```powershell
node --env-file=.env.local --import tsx server/dev.ts
```

Dans un second terminal :

```powershell
npm.cmd run dev:connected
```

Le proxy Angular transmet `/api` vers le serveur local 127.0.0.1:3001. `server/dev.ts` est réservé au développement ; Vercel exécute `api/handler.js`.

## API

| Route                                | Fonction                                                          |
| ------------------------------------ | ----------------------------------------------------------------- |
| `GET /api/config`                    | Ouverture des réservations, tarif, capacité et places restantes   |
| `POST /api/reservations`             | Enregistrement avec clé d’idempotence, nom, téléphone et quantité |
| `POST /api/reservation`              | Consultation par code privé, billets masqués avant validation     |
| `GET/POST/DELETE /api/admin-session` | État de connexion, connexion et déconnexion organisateur          |
| `GET /api/admin-reservations`        | Dossiers organisateur, après authentification                     |
| `POST /api/admin-reservation`        | Contact, confirmation manuelle du paiement ou annulation          |
| `POST /api/admin-scan`               | Vérification et validation atomique d’une entrée                  |

Le cookie organisateur est signé, HttpOnly, SameSite=Strict et Secure en production. Les écritures vérifient l’origine, les requêtes sont paramétrées, les tentatives de connexion/réservation/consultation sont limitées et les décisions de validation sont prises côté serveur. Le mot de passe et l’URL SQL ne sont pas envoyés au navigateur. Aucun SMS, appel ou message WhatsApp n’est envoyé automatiquement : les liens ouvrent les outils de l’organisateur.

Les places en attente occupent la capacité jusqu’à confirmation ou annulation ; il n’y a pas d’expiration automatique. Le club doit annuler les demandes abandonnées. Une confirmation répétée ne crée pas de doublons. Un billet déjà utilisé ne peut pas être annulé. Les annulations retirent les billets concernés. Le téléchargement recharge le statut côté serveur avant chaque export.

Une suppression ou une modification du dossier via les outils d’administration de la base reste une opération distincte, non implémentée dans cette interface. Définir avec le club une durée de conservation des coordonnées avant ouverture au public.

## Vérification

```powershell
npm.cmd run build
npm.cmd run typecheck:api
$env:CHROME_BIN = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd test -- --watch=false --browsers=ChromeHeadless
```

Tests de parcours sur ordinateur et mobile (serveur Angular démarré sur 127.0.0.1:4200 en mode démo) :

```powershell
npm.cmd run test:e2e -- --workers=2
```

Les scénarios nécessitant une connexion organisateur exigent une API de test opérationnelle et la variable `E2E_ADMIN_PASSWORD`. Sans cette configuration, ils sont explicitement ignorés ; aucun accès automatique de démonstration n’est utilisé pour les faire passer.

Tests d’intégration API : définir `TEST_DATABASE_URL` vers une **base de test dédiée dont le nom se termine par `_test`**, puis lancer `npm.cmd run test:api`. Les tables de test sont vidées entre les scénarios. Ne jamais utiliser une base de production. Sans cette variable, la suite d’intégration est explicitement ignorée.

Les tests vérifient le verrouillage avant paiement, la confirmation manuelle, la consultation sur un autre navigateur, la génération individuelle des billets, l’accès organisateur, les annulations, les capacités et les doubles scans concurrents. La caméra reste à vérifier sur téléphone physique ; sa lecture et l’import d’images sont testables localement sous HTTPS/localhost.

Références : [Vercel Functions](https://vercel.com/docs/functions/runtimes/node-js), [configuration Vercel](https://vercel.com/docs/project-configuration/vercel-json), [Postgres.js](https://github.com/porsager/postgres).
