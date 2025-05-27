# 📄 SlimFile - Compresseur de fichiers SaaS

Compressez vos fichiers PDF, images et documents Word en quelques secondes. Optimisé pour les démarches administratives et l'usage professionnel.

## ✨ Fonctionnalités

### 🔥 Core

- **Compression multi-formats** : PDF, JPG, PNG, DOCX
- **Optimisation côté client** : Pré-compression avant upload
- **Traitement par lots** : Plusieurs fichiers simultanément
- **Interface moderne** : Drag & drop, feedback temps réel

### 🔐 Authentification

- **Magic links** : Connexion sans mot de passe
- **Limites freemium** : 5 compressions/mois gratuit
- **JWT sécurisé** : Sessions persistantes

### 💳 Monétisation

- **Stripe intégré** : Paiements sécurisés
- **Plan Pro** : 9€/mois, compressions illimitées
- **Webhooks** : Sync automatique des abonnements

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- Compte Stripe (mode test)

### Setup local

```bash
# Cloner le repo
git clone https://github.com/votre-username/slimfile.git
cd slimfile

# Installer les dépendances
npm install

# Configuration environnement
cp .env.example .env.local
# Puis éditer .env.local avec vos clés

# Démarrer en développement
npm run dev
```

### Variables d'environnement

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
JWT_SECRET=votre-secret-jwt
```

## 🧪 Test local avec Stripe

```bash
# Terminal 1 - App
npm run dev

# Terminal 2 - Webhooks Stripe
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Carte de test :** `4242 4242 4242 4242`

## 📁 Structure du projet

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Authentification JWT
│   │   ├── compress/      # Compression de fichiers
│   │   └── stripe/        # Paiements et webhooks
│   ├── compress/          # Interface de compression
│   └── page.tsx           # Landing page
├── components/
│   ├── AuthModal.tsx      # Connexion
│   ├── BatchFileUploader.tsx # Upload optimisé
│   ├── CompressionResults.tsx # Résultats
│   └── UpgradeModal.tsx   # Upgrade vers Pro
├── hooks/
│   └── useAuth.ts         # Gestion authentification
└── lib/
    ├── auth.ts            # Logique auth + base données
    ├── compression.ts     # Moteurs de compression
    └── stripe.ts          # Configuration Stripe
```

## 🔧 Technologies

- **Framework** : Next.js 15 (App Router)
- **Styling** : Tailwind CSS
- **Auth** : JWT + Magic Links
- **Database** : JSON local → SQLite → PostgreSQL
- **Payment** : Stripe
- **Compression** : Sharp, pdf-lib, mammoth
- **Deploy** : Vercel

## 🎯 Roadmap

### Phase 1 ✅

- [x] Compression multi-formats
- [x] Interface utilisateur
- [x] Authentification
- [x] Paiements Stripe

### Phase 2 🚧

- [ ] Deploy production
- [ ] Analytics et tracking
- [ ] Dashboard utilisateur
- [ ] SEO optimization

### Phase 3 📋

- [ ] API publique
- [ ] Extensions Gmail/Outlook
- [ ] Templates par organisme
- [ ] Programme d'affiliation

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 License

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

## 📧 Support

- **Email** : support@slimfile.com
- **Issues** : [GitHub Issues](https://github.com/votre-username/slimfile/issues)
- **Docs** : [Documentation](https://docs.slimfile.com)

---

Fait avec ❤️ pour simplifier la compression de fichiers
