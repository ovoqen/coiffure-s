# Coiffure S — site, réservation en ligne & administration

Barbershop à Grand-Lancy (Genève) · Avenue des Communes-Réunies 94, 1212 Grand-Lancy · +41 22 743 01 65

Application web complète : site vitrine, réservation en ligne avec calcul des disponibilités réelles, fichier clients (mini CRM), espace administrateur sécurisé, e-mails de confirmation, SEO local.

---

## 1. Architecture

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend + backend | **Next.js 15** (App Router, React 19, TypeScript) | Un seul projet : pages publiques rendues côté serveur (SEO), API, Server Actions pour l'admin |
| Style | **Tailwind CSS 4** | Design noir / blanc / anthracite, accent rouge du logo, mobile d'abord |
| Base de données | **Prisma ORM** + SQLite (fichier) | Simple, rapide, sauvegarde = copier un fichier. PostgreSQL possible (voir §6) |
| Auth admin | Mot de passe haché **bcrypt** en base + session **JWT signée** (cookie httpOnly) | Aucun mot de passe dans le code ; middleware + vérification dans chaque action |
| Dates | **Luxon**, fuseau `Europe/Zurich` | Créneaux corrects aux changements d'heure été/hiver |
| E-mails | **Nodemailer** (SMTP) | Fonctionne avec Gmail, Infomaniak, Brevo, Resend… |
| SMS / WhatsApp | **Twilio** (prêt, désactivé) | Rappels activables depuis l'admin |
| Images | **sharp** | Redimensionnement, WebP, suppression des données GPS |

```
src/
├─ app/
│  ├─ (site)/            Site public : accueil, tarifs, équipe, galerie, réservation, contact, légal
│  ├─ admin/             Connexion + espace admin (tableau de bord, planning, RDV, clients, équipe,
│  │                     prestations, horaires & congés, galerie, paramètres) + Server Actions
│  ├─ api/               availability, bookings (création/annulation/.ics), cron/reminders, admin/*
│  ├─ uploads/[...path]  Sert les photos envoyées depuis l'admin
│  ├─ sitemap.ts, robots.ts, manifest.ts
├─ components/           site/, booking/ (parcours de réservation), admin/
├─ lib/
│  ├─ availability-core.ts   ⭐ calcul pur des créneaux (testé)
│  ├─ availability.ts        horaires + RDV + blocages depuis la base
│  ├─ booking.ts             création / déplacement / annulation, anti double-réservation
│  ├─ customers.ts, crm.ts   fichier clients, visites, dernière / prochaine visite
│  ├─ notifications/         e-mails (modèles), SMS, WhatsApp, journal, rappels, .ics
│  ├─ settings.ts            paramètres du salon modifiables dans l'admin
│  ├─ auth.ts, session.ts    authentification
│  └─ seo.tsx                données structurées HairSalon
prisma/
├─ schema.prisma          tables : admins, barbers, services, barber_services, customers,
│                         appointments, working_hours, blocked_slots, gallery, settings,
│                         notification_logs
├─ migrations/            migration initiale
└─ seed.ts                données initiales (idempotent)
```

### Règles de réservation (toutes garanties côté serveur)
- Le client choisit **prestation → coiffeur → date → heure → coordonnées → confirmation**.
- Seuls les créneaux réellement libres sont proposés, selon : durée de la prestation, horaires du coiffeur, pause, RDV existants, absences, congés, créneaux bloqués, fermetures du salon, délai minimum et fenêtre de réservation.
- **Jamais deux RDV simultanés pour un même coiffeur** : contrôle dans une transaction sérialisable + verrou par coiffeur. Testé avec 5 réservations simultanées du même créneau → 1 acceptée, 4 refusées. Même l'admin (« forcer l'horaire ») ne peut pas créer de chevauchement.
- La prestation est « figée » dans le RDV (nom, prix, durée) : changer un prix ne modifie pas les RDV existants.

---

## 2. Démarrer en local

Prérequis : Node.js ≥ 20 (installé ici dans `~/.local/node` ; ajoutez `export PATH=~/.local/node/bin:$PATH` à votre `~/.zshrc`).

```bash
npm install
cp .env.example .env        # puis remplir AUTH_SECRET et ADMIN_PASSWORD
npx prisma migrate deploy   # crée la base
npm run db:seed             # admin + 3 coiffeurs + 4 prestations + horaires
npm run dev                 # http://localhost:3000  — admin : http://localhost:3000/admin
```

Le `.env` local a déjà été généré avec des secrets aléatoires. Le mot de passe admin initial est la valeur `ADMIN_PASSWORD` de ce fichier : **changez-le dans Admin → Paramètres** dès la première connexion.

> La base locale contient des clients et rendez-vous **fictifs** de démonstration/test (`npm run db:seed -- --demo`). La base de production démarre vide (seulement les données initiales).

Tests :
```bash
npm test                    # tests unitaires du calcul des créneaux
npm run test:integration    # scénarios complets (réservation, caisse, bons, stock, e-mails) sur des bases de test dédiées
npm run typecheck
```

---

## 3. Ce que vous gérez depuis l'administration (sans toucher au code)

| Menu | Possibilités |
|---|---|
| **Tableau de bord** | RDV aujourd'hui / demain / semaine, CA estimé, nombre de clients, nouveaux clients, prochaines réservations |
| **Planning** | Vue jour (tous les coiffeurs côte à côte) ou par coiffeur (jour / semaine). Clic sur une case libre → créer un RDV ou bloquer un créneau. Clic sur un RDV → modifier, déplacer, terminé, absent, annuler |
| **Rendez-vous** | Liste filtrable (période, coiffeur, statut, recherche), création, modification, déplacement, annulation (avec e-mail au client), suppression |
| **Clients** | Recherche, filtres (RDV à venir, nouveaux, inactifs, consentement marketing, anniversaires), fiche avec historique, visites, dernière / prochaine visite, notes internes, **export Excel/CSV** (complet ou marketing seulement), suppression (droit à l'effacement) |
| **Équipe** | Ajouter / renommer / désactiver / supprimer un coiffeur, photo, présentation, couleur, prestations réalisées, horaires propres, congés, absences, créneaux bloqués, ordre d'affichage |
| **Prestations** | Nom, description, prix, durée, activation, ordre, ajout, suppression (désactivation si déjà réservée) |
| **Horaires & congés** | Horaires du salon (affichés sur le site), application à toute l'équipe, fermetures exceptionnelles / jours fériés |
| **Galerie** | Envoi de plusieurs photos, catégories (coupes, transformations, intérieur, salon, équipe), description SEO, ordre, masquer, supprimer |
| **Paramètres** | Coordonnées, réseaux, texte « Le salon », images du site (accueil, intérieur, façade), règles de réservation (intervalle, délai minimum, fenêtre, temps tampon, délai d'annulation), rappels, mot de passe, accès administrateurs supplémentaires |

---

## 4. ⚠️ À fournir / connecter avant la mise en ligne

1. **Photos façade et intérieur** — seul le logo m'est parvenu. Ajoutez-les dans *Admin → Paramètres → Images du site* (l'image d'accueil = l'intérieur). En attendant, l'accueil utilise un visuel sombre avec le logo.
2. **Envoi des e-mails (SMTP)** — sans cela les confirmations sont seulement affichées dans la console du serveur. Option rapide avec Gmail :
   - activer la validation en 2 étapes sur le compte Google, créer un **mot de passe d'application** ;
   - `.env` : `SMTP_HOST="smtp.gmail.com"`, `SMTP_PORT="465"`, `SMTP_SECURE="true"`, `SMTP_USER="coiffuresula@gmail.com"`, `SMTP_PASSWORD="<mot de passe d'application>"`.
   - Recommandé à terme : une adresse sur votre propre domaine (Infomaniak, Brevo, Resend) pour une meilleure délivrabilité.
3. **Adresse e-mail** — corrigée en `coiffuresula@gmail.com` (paramètres, `.env` et compte administrateur).
4. **WhatsApp** — le bouton ouvre `wa.me/41227430165`. Cela ne fonctionne que si ce numéro fixe est enregistré sur **WhatsApp Business** (possible avec vérification par appel vocal). Sinon, indiquez un numéro mobile dans *Paramètres → WhatsApp*.
5. **Nom de domaine + hébergement** (voir §5), puis `SITE_URL="https://votre-domaine.ch"`.
6. **Coordonnées GPS** du salon dans *Paramètres* (améliore le SEO local).
7. **Mentions légales** : raison sociale et numéro IDE (`src/app/(site)/mentions-legales/page.tsx`).
8. **Rappels automatiques (optionnel)** : planifier un appel toutes les 15 min à `GET /api/cron/reminders` avec l'en-tête `Authorization: Bearer <CRON_SECRET>`, puis activer les rappels dans *Paramètres*.
9. **SMS / WhatsApp automatiques (optionnel)** : compte Twilio → `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM` et/ou `TWILIO_WHATSAPP_FROM`. L'envoi WhatsApp initié par le salon nécessite des modèles de message validés par Meta.

---

## 5. Mise en production

> **Guide complet pas à pas : [DEPLOIEMENT.md](DEPLOIEMENT.md)** (domaine, serveur, HTTPS automatique avec Caddy, variables, sauvegardes, mises à jour).

### Option recommandée : serveur (VPS) avec Docker
Par exemple un VPS Infomaniak (hébergé en Suisse), Hetzner, ou toute plateforme acceptant Docker avec un volume persistant (Railway, Fly.io, Render).

```bash
# sur le serveur
git clone <votre dépôt> coiffure-s && cd coiffure-s
cp .env.example .env    # remplir : SITE_URL, AUTH_SECRET, ADMIN_*, SMTP_*, CRON_SECRET
docker compose up -d --build
```
- Base de données **et** photos sont dans le volume `/data` → sauvegardez ce volume (ex. copie quotidienne de `/data/coiffure-s.db` et `/data/uploads`).
- Placez un reverse proxy HTTPS devant le port 3000 (Caddy, Nginx, ou celui de la plateforme).
- Au premier démarrage : migrations + création de l'administrateur depuis `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Option Vercel / serverless
Possible mais demande deux adaptations : PostgreSQL (§6) et un stockage d'images externe (remplacer `saveImage()` dans `src/lib/storage.ts` par Vercel Blob / S3 / Cloudflare R2), car le disque n'y est pas persistant.

### Après la mise en ligne (SEO local)
- Créer / revendiquer la fiche **Google Business Profile** (catégorie « Barbier » + « Salon de coiffure pour hommes »), même nom, adresse et téléphone que le site, lien vers `/reservation`.
- Soumettre `https://votre-domaine.ch/sitemap.xml` dans **Google Search Console**.
- Ajouter le lien du site dans les bios Instagram (@coiffure_sula) et TikTok (@coiffuresulagva).
- Inviter les clients satisfaits à laisser un avis Google.

---

## 6. Passer à PostgreSQL (optionnel)
1. Dans `prisma/schema.prisma` : `provider = "postgresql"`.
2. Supprimer `prisma/migrations` puis générer la migration Postgres : `npx prisma migrate dev --name init` (sur une base **vide** de développement).
3. `DATABASE_URL="postgresql://…"`. La recherche insensible à la casse est gérée automatiquement (`like()` dans `src/lib/db.ts`).

---

## 7. SEO intégré
- Titles / meta descriptions uniques par page, H1/H2 cohérents, URLs propres (`/tarifs`, `/equipe`, `/galerie`, `/reservation`, `/contact`), balises canoniques.
- Données structurées **HairSalon** (adresse, téléphone, horaires dynamiques, prestations et prix, réseaux sociaux, action de réservation).
- `sitemap.xml`, `robots.txt` (admin et pages privées exclues), Open Graph + image de partage, manifest PWA, favicon.
- Images optimisées automatiquement (AVIF/WebP, tailles adaptées), textes alternatifs, carte Google chargée au clic (performance + vie privée).
- Mots-clés locaux intégrés naturellement (barber / coiffeur homme / barbershop, Grand-Lancy, Lancy, Genève) sans sur-optimisation.

## 8. Protection des données (nLPD / RGPD)
- Case de consentement marketing **séparée et non pré-cochée** ; date du consentement enregistrée ; jamais retirée ni ajoutée automatiquement.
- Acceptation de la politique de confidentialité obligatoire pour réserver ; page `/confidentialite`.
- Export marketing limité aux clients consentants ; suppression complète d'un client sur demande.
- Pas de traceurs ; carte Google chargée seulement après clic ; données EXIF/GPS retirées des photos.
- Sécurité : mots de passe bcrypt, sessions signées, limitation des tentatives de connexion et de réservation, champ anti-robot, en-têtes de sécurité HTTP, protection contre l'injection de formules dans l'export CSV.

---

## 9. Gestion du salon (caisse, stock, bons cadeaux, e-mails, équipe)

| Module | Où | Ce qu'il fait |
|---|---|---|
| **Caisse** | Admin → Caisse | Ouverture / clôture quotidienne (fond de caisse, espèces attendues vs comptées, écart). Encaissement d'un RDV en un clic : la prestation et le client sont repris, les **acomptes** déjà réglés sont déduits. Ajout de prestations, produits, bons cadeaux ou lignes libres, remise par ligne ou globale (CHF ou %). **Paiements combinés** : espèces (calcul de la monnaie), carte, TWINT, bon cadeau. |
| **Ventes & reçus** | Admin → Ventes & reçus | Historique des tickets, reçu imprimable (format ticket) et envoi par e-mail, **remboursements** (partiels ou totaux, retour en stock, recrédit d'un bon) avec motif obligatoire et historique. |
| **Bons cadeaux** | Site : /bon-cadeau · Admin → Bons cadeaux | Achat en ligne (montant, acheteur, bénéficiaire, message), paiement Stripe, bon PDF téléchargeable et envoyé par e-mail. **Code unique de 5 caractères** (sans 0/O/1/I/L), vérifié contre les doublons, attribué au paiement et figé. Solde, **utilisation partielle**, historique des utilisations, statuts actif / partiel / utilisé / expiré / annulé, recherche par code, nom ou e-mail. Impossible de dépasser le solde ou de réutiliser un bon épuisé (vérification atomique). Vente au salon possible depuis la caisse. |
| **Produits & stock** | Admin → Produits & stock | Catalogue (prix de vente, coût, fournisseur, référence), produits à vendre vs consommables, déduction automatique à la vente, livraisons, corrections d'inventaire, usage salon, alertes de stock bas (tableau de bord + menu). |
| **E-mails automatiques** | Admin → E-mails automatiques | Modèles modifiables (objet, texte, bouton, variables), activation et délais : confirmation, rappel, remerciement après visite, anniversaire, envoi du bon. Campagnes promotionnelles (clients consentants uniquement, lien de désinscription signé). Historique des envois et erreurs. Exécution automatique toutes les 10 min (planificateur interne). |
| **Statistiques** | Admin → Statistiques | CA prestations / produits, encaissements par moyen, panier moyen, top prestations et produits, annulations, résultats par collaborateur, exports CSV/Excel (ventes, lignes, paiements, bons, clôtures, stock). **La vente d'un bon est un encaissement, son utilisation est du CA : jamais compté deux fois.** |
| **Collaborateurs & droits** | Admin → Paramètres → Accès | Un compte par collaborateur, lié à son coiffeur, droits à cocher (agenda, clients, caisse, remboursements, bons, produits, horaires, galerie, candidatures). Réservés au propriétaire : paramètres, prix, équipe, finances, exports, e-mails, historique. Vérifié côté serveur sur chaque page, action et API. Un collaborateur lié voit « Mes résultats ». |
| **Historique** | Admin → Historique | Journal des modifications importantes : caisse, remises, remboursements, bons, prix, stock, droits, paramètres, suppressions. |

### Paiements : ce qui est réellement confirmé
- **Bons cadeaux en ligne** : marqués « payés » **uniquement** après confirmation de Stripe (webhook ou vérification de la session). Sans clé Stripe : mode démonstration en local, **achat masqué en production**.
- **Carte / TWINT au salon** : encaissés sur votre terminal, puis **enregistrés manuellement** dans la caisse — clairement indiqués « saisi manuellement » sur l'écran, les reçus et les exports. (Une intégration directe d'un terminal SumUp / Stripe Terminal / Worldline est possible plus tard.)
- **Taxes** : désactivées (société non assujettie à la TVA). Activables dans Paramètres → Caisse & taxes si cela change.

### À fournir pour activer le paiement en ligne (Stripe)
1. Créer un compte sur **stripe.com** (société suisse, IBAN pour les versements) et activer **TWINT** dans *Paramètres → Moyens de paiement*.
2. *Développeurs → Clés API* → copier la **clé secrète** → `STRIPE_SECRET_KEY`.
3. *Développeurs → Webhooks* → ajouter `https://votre-domaine.ch/api/stripe/webhook` avec les événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `invoice.paid`, `invoice.payment_failed` (ces deux derniers pour les mensualités d'abonnement) → copier le **secret de signature** → `STRIPE_WEBHOOK_SECRET`.
4. Tester d'abord avec les clés de test (`sk_test_…`, carte 4242 4242 4242 4242), puis passer aux clés live.

---

## 10. Espace client, fidélité et offres

| Partie | Où | Ce qu'il fait |
|---|---|---|
| **Espace client** | Site : icône 👤 → /compte | Inscription (prénom, nom, e-mail, téléphone, date de naissance facultative), **e-mail vérifié obligatoire**, le mot de passe est choisi après vérification. Rattachement automatique à la fiche existante portant le même e-mail (pas de doublon). Rubriques : Mon compte (coordonnées, consentements, rendez-vous, bons achetés), **Ma fidélité**, **Mes offres**, Notifications. Réservation préremplie et rattachée à la fiche. |
| **Programme de fidélité** | Admin → Fidélité | Activation, points par visite payée ou par CHF dépensé, expiration après X mois sans visite, récompenses (réduction CHF / %, prestation offerte, cadeau) avec seuil de points, ajustement manuel motivé, historique. |
| **Offres** | Admin → Offres | Titre, message, avantage, prestations concernées, achat minimum, dates, conditions, nombre d'utilisations. Destinataires : tous les clients consentants, un client précis, nouveaux, fidèles (X visites), anniversaires du mois, inactifs (X jours). Notification dans l'espace client + e-mail (si consentement) + push (si activé par le client). Suivi : envoyées, lues, utilisées. |
| **Caisse** | Ticket avec un client | Solde de points, récompenses utilisables en un clic, offres du client. Contrôle de validité, des prestations concernées, du montant minimum et de l'usage unique (vérifié aussi au paiement). |
| **Doublons** | Fiche client → « Fusionner une fiche en double » | Transfère rendez-vous, achats, bons, points, offres et notifications, puis supprime la fiche en double. |

**Règles comptables** : points attribués uniquement quand le ticket est entièrement payé ; la vente d'un bon cadeau ne rapporte pas de points (la prestation payée avec le bon, oui) ; remboursement → points retirés au prorata, remboursement total → points de récompense rendus.

**Notifications push** : fonctionnent sans compte externe (clés VAPID dans `.env`, générées avec `npx web-push generate-vapid-keys`). Sur iPhone, le client doit d'abord ajouter le site à l'écran d'accueil. Gardez les mêmes clés en production, sinon les abonnements existants deviennent invalides.

**E-mails de l'espace client** (activation, mot de passe oublié) : nécessitent le SMTP. Sans SMTP, aucun client ne peut activer son compte — à configurer avant l'ouverture de l'espace client au public.

---

## 11. Abonnements (3 séances par mois, engagement 6 mois)

| Partie | Où | Ce qu'il fait |
|---|---|---|
| **Page publique** | /abonnements (menu Prestations) | Les formules actives avec prix mensuel, total sur 6 mois et « Engagement obligatoire de 6 mois ». Souscription réservée aux clients connectés (espace client). |
| **Souscription** | /abonnements/[formule] | Rappel de l'engagement, case des conditions **non cochée par défaut**, autorisation de prélèvement (paiement en ligne). Version des conditions, date, heure et IP enregistrées sur le contrat. Contrat activé **uniquement** après confirmation du 1er paiement ; récapitulatif envoyé par e-mail. |
| **Paiement** | Stripe (carte) ou au salon | En ligne : prélèvement mensuel automatique par carte via Stripe, arrêt programmé à la fin des 6 mois (aucun renouvellement). TWINT ne permet pas de prélèvement récurrent : il reste possible au salon. Au salon : chaque mensualité s'encaisse depuis la fiche du contrat (bouton « Encaisser » → ticket de caisse). |
| **Périodes** | — | 6 périodes d'un mois à partir du 1er paiement ; chaque période payée ouvre 3 séances ; pas de report. Mensualité échouée → « paiement en retard », séances bloquées jusqu'au paiement. |
| **Caisse** | Ticket avec un client abonné | Panneau « Abonnement du client » (séances restantes, fin de période). Bouton « Couvrir par l'abonnement » sur une prestation incluse → ligne à 0 CHF, les suppléments restent payants. La séance n'est déduite qu'à la validation du ticket (« Valider le passage » si le total est 0). Une réservation, une annulation ou une absence ne déduisent rien. |
| **Admin** | Admin → Abonnements | Statistiques, formules (modifiables pour les futurs contrats uniquement), conditions et version, souscription au salon, liste des contrats ; fiche contrat : client, dates, mensualités, séances par période, historique des passages, corrections ±1 avec motif, renvoi du récapitulatif, résiliation exceptionnelle (propriétaire). |
| **Agenda & fiches** | Planning, rendez-vous, fiche client | Mention « Abonné » sur le planning et le rendez-vous ; bloc Abonnements sur la fiche client ; badge « Inclus dans votre abonnement » dans la réservation en ligne. |

**Règles comptables** : chaque mensualité payée est un chiffre d'affaires ; les passages couverts sont à 0 CHF (pas de double comptage).

---

## 12. Protection des données et sécurité

| Sujet | Où | Ce qui est en place |
|---|---|---|
| **Mentions légales** | Admin → Paramètres → Informations légales | Raison sociale, forme juridique, IDE, registre du commerce, responsable, hébergeur. Affichés sur /mentions-legales, /confidentialite et les reçus. |
| **Conditions générales** | /conditions (pied de page, réservation, bons, abonnements, inscription) | Réservation, annulation, retards/absences (avertissement, sans frais), tarifs, offres, bons cadeaux (validité réglable), abonnements, tournages, responsabilités, for. **Projet à faire valider par un juriste.** |
| **Durées de conservation** | `src/lib/retention-rules.ts` + purge automatique quotidienne | Clients inactifs 3 ans → suppression ou anonymisation ; candidatures modèles non retenues et Jobs 12 mois ; journal des envois 24 mois ; journal admin 3 ans ; liens 30 jours ; coordonnées des bons terminés 3 ans. |
| **Effacement** | Fiche client → « Effacer le client » ; client : Mon compte → Mes données | Suppression complète, ou anonymisation si tickets / bons / contrats (tickets gardés 10 ans sans nom). Refusé si abonnement en cours (le propriétaire peut forcer). |
| **Export des données** | Mon compte → « Télécharger mes données » | Fichier JSON de toutes les données du client. |
| **Droit à l'image** | Admin → Autorisations d'image | Autorisation signée au doigt sur tablette/téléphone au salon, texte versionné, supports (réseaux / site / publicités), durée, mineurs (14–15 ans : représentant légal), retrait → photos de galerie liées masquées. La galerie refuse de publier une personne reconnaissable sans autorisation valable. |
| **Devenir modèle** | /devenir-modele | Date de naissance obligatoire : refus avant 14 ans ; de 14 à 15 ans, coordonnées et accord du parent. Consentements séparés (candidature / tournage). |
| **Droits de l'équipe** | Paramètres → Accès collaborateurs | Son planning ou celui de toute l'équipe ; coordonnées clients visibles ou masquées ; export ; effacement ; autorisations d'image. |
| **Double authentification** | Admin → Mon compte | Code à 6 chiffres (Google/Microsoft Authenticator…) + 8 codes de secours. Téléphone perdu : `npm run admin:create -- email "nouveau mot de passe"` sur le serveur remet tout à zéro. |
| **Sessions** | — | Changer de mot de passe déconnecte les autres appareils (admin et clients). |
| **Sauvegardes** | `BACKUP_KEY`, `BACKUP_DIR` | Archive chiffrée AES-256 par jour (base + photos + fichiers privés), 30 jours. `npm run backup:now`, `npm run backup:restore -- fichier.csb dossier`. **Copiez le dossier hors du serveur** et gardez la clé ailleurs. |
| **E-mails de candidatures** | — | Plus aucune photo, CV ni coordonnée dans Gmail : lien vers l'admin uniquement. |
| **En-têtes** | `next.config.ts` | CSP stricte (seule la carte Google est autorisée en iframe), HSTS en production. |

**À faire de votre côté** : contrats de sous-traitance (hébergeur, Google Workspace, Stripe, Twilio) ; vérifier la certification « Data Privacy Framework » de chaque prestataire américain ; faire relire /conditions, /confidentialite et le texte d'autorisation d'image par un juriste.
