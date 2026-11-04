# Mettre Coiffure S en ligne sur votre propre domaine

Ce guide permet de publier le site **sans dépendre de Claude** : tout le code est à vous, il tourne sur votre serveur et se met à jour avec des commandes standard.

---

## 1. Ce qu'est votre site (technologie)

| Élément | Détail |
|---|---|
| Type | Application web **Next.js 15** (React 19, TypeScript) avec serveur intégré. Ce n'est **pas** un site HTML statique. |
| Serveur | Oui : un serveur Node.js 22 (réservations, caisse, comptes clients, e-mails, paiements, automatisations toutes les 10 min). |
| Base de données | Oui : **SQLite** (un fichier `coiffure-s.db`), gérée par Prisma. Les migrations s'appliquent automatiquement au démarrage. PostgreSQL possible (README § 6). |
| Fichiers | Photos (galerie, équipe), documents privés (CV, photos des candidats, signatures), sauvegardes : dossier persistant `/data`. |
| Variables d'environnement | Oui : voir `.env.example` (aucun secret dedans). |
| Hébergement compatible | Un serveur (VPS) avec Docker — recommandé — ou une plateforme acceptant Docker **avec un disque persistant** (Railway, Fly.io, Render). Pas d'hébergement « statique » (type FTP) ni Vercel sans adaptation. |

Fichiers d'hébergement fournis :

| Fichier | Rôle |
|---|---|
| `Dockerfile` | Construit l'image du site (Node 22), applique les migrations et crée l'administrateur au 1er démarrage. Contrôle de santé intégré. |
| `docker-compose.yml` | Lance le site + **Caddy**, qui fournit le **HTTPS automatique** (certificat gratuit) pour votre domaine. |
| `Caddyfile` | Configuration HTTPS : votre domaine → le site ; `www.` → redirection. |
| `.env.example` | Modèle des variables, sans mot de passe ni clé. |
| `.dockerignore` | Exclut de l'image les fichiers locaux (base de test, `.env`, vidéos…). |
| `scripts/smoke.mjs` | Contrôle de toutes les pages après la mise en ligne. |

---

## 2. Récupérer le code source complet

Le code est sur votre Mac, dans le dossier **`~/Desktop/site`**. Deux façons de le garder et de l'envoyer :

**A. Archive ZIP (le plus simple)** — une archive propre a été préparée : `~/Desktop/coiffure-s-code-source-2026-10-15.zip`
(sans `node_modules`, sans `.env`, sans base de test). Pour en refaire une plus tard, depuis le dossier du projet :

```bash
cd ~/Desktop/site && zip -r ~/Desktop/coiffure-s-code-source.zip . -x "node_modules/*" ".next/*" ".env" "*.db" "*.db-journal" "storage/private/*" "backups/*" "demo/*" "biggest/*" ".claude/*" "*.DS_Store" "*.tsbuildinfo"
```

**B. Dépôt GitHub privé (recommandé pour l'historique et les mises à jour)**
1. Créez un compte sur github.com puis un dépôt **privé** vide nommé `coiffure-s`.
2. Dans le Terminal :

```bash
cd ~/Desktop/site && git init && git add . && git commit -m "Coiffure S – version de production"
```

```bash
git remote add origin https://github.com/VOTRE-COMPTE/coiffure-s.git && git branch -M main && git push -u origin main
```

Le fichier `.gitignore` empêche l'envoi de `.env`, des bases de données et des fichiers clients.

> ⚠️ Le dossier `biggest/` contient un autre projet (démo « BIGGEST ») : il est exclu de l'archive et de l'hébergement. Déplacez-le hors de `site/` si vous le gardez.

---

## 3. Ce qu'il faut acheter / créer

1. **Un nom de domaine** (ex. `coiffure-s.ch`) chez un registraire : Infomaniak, Hostpoint, OVH…
2. **Un serveur VPS Linux** (Ubuntu 24.04, **2 Go de RAM minimum**, 20 Go de disque). Pour garder les données en Suisse : Infomaniak (VPS Lite / Cloud), Exoscale… ; sinon Hetzner (Allemagne/Finlande).
3. **Gmail** : un « mot de passe d'application » pour l'envoi des e-mails (compte Google → Sécurité → Validation en deux étapes → Mots de passe des applications).
4. **Stripe** (facultatif) : pour vendre bons cadeaux et abonnements en ligne.

---

## 4. Relier le domaine au serveur (DNS)

Chez votre registraire, zone DNS du domaine :

| Type | Nom | Valeur |
|---|---|---|
| A | `@` (domaine nu) | adresse IP du serveur |
| A | `www` | adresse IP du serveur |

(Ajoutez aussi les enregistrements `AAAA` si votre serveur a une adresse IPv6.) La propagation prend de quelques minutes à quelques heures.

---

## 5. Installer et lancer le site sur le serveur

Connectez-vous au serveur (Terminal du Mac) :

```bash
ssh root@ADRESSE-IP-DU-SERVEUR
```

Installez Docker (script officiel) :

```bash
curl -fsSL https://get.docker.com | sh
```

Copiez le code sur le serveur — soit depuis GitHub :

```bash
git clone https://github.com/VOTRE-COMPTE/coiffure-s.git /opt/coiffure-s && cd /opt/coiffure-s
```

— soit depuis l'archive ZIP (à lancer **sur votre Mac**, puis décompresser sur le serveur) :

```bash
scp ~/Desktop/coiffure-s-code-source-2026-10-15.zip root@ADRESSE-IP-DU-SERVEUR:/opt/
```

```bash
apt-get install -y unzip && mkdir -p /opt/coiffure-s && unzip /opt/coiffure-s-code-source-2026-10-15.zip -d /opt/coiffure-s && cd /opt/coiffure-s
```

Créez le fichier de configuration :

```bash
cp .env.example .env && nano .env
```

Remplissez au minimum : `DOMAIN`, `DOMAIN_WWW`, `SITE_URL`, `AUTH_SECRET`, `ADMIN_PASSWORD`, `SMTP_PASSWORD`, `BACKUP_KEY`.
Pour générer les clés secrètes (à coller dans `.env`) :

```bash
openssl rand -base64 48
```

```bash
openssl rand -hex 24
```

(la 1re pour `AUTH_SECRET`, la 2e pour `BACKUP_KEY`). Clés de notifications push :

```bash
docker run --rm node:22-slim npx -y web-push generate-vapid-keys
```

Construisez et démarrez :

```bash
docker compose up -d --build
```

Suivez le démarrage (Ctrl+C pour quitter l'affichage, le site continue de tourner) :

```bash
docker compose logs -f web
```

Les lignes `⚠ Configuration` indiquent ce qui manque encore (e-mails, Stripe…). Une ligne `✖` empêche le démarrage : corrigez `.env` puis relancez `docker compose up -d`.

Vérifiez que tout répond (depuis le serveur ou votre Mac) :

```bash
docker compose exec web node scripts/smoke.mjs https://coiffure-s.ch
```

---

## 6. Après la 1re mise en ligne

1. Connectez-vous sur `https://votre-domaine/admin/login` avec `ADMIN_EMAIL` / `ADMIN_PASSWORD`, puis :
   - **Mon compte** → activez la **double authentification** ;
   - **Paramètres → Informations légales** : raison sociale, forme juridique, IDE, hébergeur ;
   - **Prestations** : vérifiez prix et durées (activez « Coupe + shampoing ») ;
   - **Équipe**, **Horaires**, **Galerie**, **Offres** : vos contenus.
2. Retirez `ADMIN_PASSWORD` de `.env` (le mot de passe est déjà enregistré, chiffré, dans la base).
3. **Stripe** → Développeurs → Webhooks → `https://votre-domaine/api/stripe/webhook` (événements listés dans `.env.example`), puis copiez le secret dans `STRIPE_WEBHOOK_SECRET` et relancez `docker compose up -d`.
4. **Google Search Console** : déclarez `https://votre-domaine/sitemap.xml`. **Google Business Profile** : lien vers le site et `/reservation`.

### Reprendre vos réglages faits en local ?
Le serveur démarre avec une base **neuve** (prestations, coiffeurs, horaires et formules de base). Votre base locale contient des **données de test** (clients fictifs, ventes de test) : il est plus propre de ressaisir vos réglages dans l'admin en ligne. Si vous préférez transférer la base locale, demandez d'abord un nettoyage des données de test.

---

## 7. Sauvegardes (indispensable)

- Une sauvegarde chiffrée est créée chaque nuit dans le volume (`/data/backups`), gardée 30 jours. Créer une sauvegarde tout de suite :

```bash
docker compose exec web npm run backup:now
```

- **Copiez-les hors du serveur** régulièrement (sur votre Mac) :

```bash
mkdir -p ~/Sauvegardes-coiffure-s && docker compose cp web:/data/backups /tmp/cs-backups && scp -r root@ADRESSE-IP-DU-SERVEUR:/tmp/cs-backups ~/Sauvegardes-coiffure-s/
```

(la partie avant `&& scp` se lance sur le serveur, la commande `scp` sur votre Mac).
- Gardez **`BACKUP_KEY` et `AUTH_SECRET` dans un gestionnaire de mots de passe** : sans `BACKUP_KEY`, aucune restauration possible.
- Restauration : `npm run backup:restore -- fichier.csb dossier` (voir README § 12).

---

## 8. Mettre à jour le site plus tard

Avec GitHub :

```bash
cd /opt/coiffure-s && git pull && docker compose up -d --build
```

Avec une archive : remplacez les fichiers dans `/opt/coiffure-s` (en gardant `.env`), puis `docker compose up -d --build`.
Les données (base, photos, sauvegardes) restent dans le volume Docker et ne sont jamais effacées par une mise à jour. Les migrations de base s'appliquent toutes seules au démarrage.

---

## 9. Commandes utiles (sur le serveur, dans `/opt/coiffure-s`)

| Action | Commande |
|---|---|
| Voir l'état | `docker compose ps` |
| Voir les journaux | `docker compose logs -f web` |
| Redémarrer | `docker compose restart web` |
| Arrêter | `docker compose down` (les données restent) |
| Mot de passe admin perdu / téléphone 2FA perdu | `docker compose exec web npm run admin:create -- email@exemple.ch "NouveauMotDePasse10+"` |
| Contrôle des pages | `docker compose exec web node scripts/smoke.mjs https://votre-domaine` |
| Sauvegarde immédiate | `docker compose exec web npm run backup:now` |

---

## 10. Sans serveur à gérer (alternative)

Plateformes qui construisent le `Dockerfile` elles-mêmes : **Railway**, **Render**, **Fly.io**.
- Créez le service depuis votre dépôt GitHub, ajoutez un **volume persistant monté sur `/data`**, copiez les variables de `.env.example` dans leur interface (sans `DOMAIN`/`DOMAIN_WWW`, inutiles : la plateforme fournit le HTTPS), puis reliez votre domaine dans leurs réglages.
- Vérifiez la région des serveurs (Europe) et ajoutez-la dans **Paramètres → Informations légales → Hébergeur**.

---

## Construire et tester sur votre Mac (facultatif)

```bash
npm ci
```

```bash
npm run build
```

```bash
npm run start
```

```bash
npm test && npm run test:integration
```
