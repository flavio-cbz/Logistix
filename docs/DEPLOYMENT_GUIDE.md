# Guide de Déploiement - Logistix

## Vue d'ensemble

Ce guide décrit les procédures de déploiement pour l'application Logistix dans différents environnements (développement, staging, production).

## Prérequis

### Environnement de Déploiement

- **Node.js**: Version 18.x ou supérieure
- **npm**: Version 9.x ou supérieure
- **PM2**: Gestionnaire de processus pour la production
- **Nginx**: Serveur web reverse proxy (optionnel)
- **SSL/TLS**: Certificats pour HTTPS en production

### Variables d'Environnement

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=file:./data/logistix.db
NEXTAUTH_SECRET=your-production-secret-key
NEXTAUTH_URL=https://your-domain.com
LOG_LEVEL=info
PORT=3000

# Sécurité
ALLOWED_ORIGINS=https://your-domain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# Monitoring
SENTRY_DSN=your-sentry-dsn
ANALYTICS_ID=your-analytics-id
```

## Déploiement en Développement

### Configuration Locale

```bash
# Cloner le repository
git clone <repository-url>
cd logistix

# Installer les dépendances
npm install

# Configuration de l'environnement
cp .env.example .env.local

# Initialiser la base de données
npm run db:generate
npm run db:migrate

# Démarrer en mode développement
npm run dev
```

### Hot Reload et Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev",
      "env": {
        "NODE_OPTIONS": "--inspect"
      }
    }
  ]
}
```

## Déploiement en Staging

### Configuration Staging

```bash
# Variables d'environnement staging
NODE_ENV=staging
DATABASE_URL=file:./data/logistix-staging.db
NEXTAUTH_URL=https://staging.your-domain.com
LOG_LEVEL=debug
```

### Pipeline de Déploiement

```yaml
# .github/workflows/staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: |
          npm run test
          npm run test:e2e
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to staging server
        run: |
          rsync -avz --delete \
            --exclude node_modules \
            --exclude .git \
            ./ user@staging-server:/var/www/logistix/
      
      - name: Restart application
        run: |
          ssh user@staging-server "cd /var/www/logistix && \
            npm ci --production && \
            pm2 restart logistix-staging"
```## Déploi
ement en Production

### Préparation du Serveur

#### Installation des Dépendances Système

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installation de PM2 globalement
sudo npm install -g pm2

# Installation de Nginx (optionnel)
sudo apt install nginx

# Configuration du firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

#### Configuration de l'Utilisateur de Déploiement

```bash
# Créer un utilisateur dédié
sudo adduser logistix
sudo usermod -aG sudo logistix

# Configuration SSH pour le déploiement
sudo mkdir -p /home/logistix/.ssh
sudo cp ~/.ssh/authorized_keys /home/logistix/.ssh/
sudo chown -R logistix:logistix /home/logistix/.ssh
sudo chmod 700 /home/logistix/.ssh
sudo chmod 600 /home/logistix/.ssh/authorized_keys
```

### Configuration de Production

#### Structure des Répertoires

```bash
# Structure recommandée
/var/www/logistix/
├── current/           # Version actuelle
├── releases/          # Versions précédentes
│   ├── 20241010-120000/
│   └── 20241009-180000/
├── shared/            # Fichiers partagés
│   ├── data/          # Base de données
│   ├── logs/          # Logs
│   └── uploads/       # Fichiers uploadés
└── scripts/           # Scripts de déploiement
```

#### Configuration PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'logistix-prod',
    script: 'server.js',
    cwd: '/var/www/logistix/current',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    log_file: '/var/www/logistix/shared/logs/combined.log',
    out_file: '/var/www/logistix/shared/logs/out.log',
    error_file: '/var/www/logistix/shared/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

#### Configuration Nginx

```nginx
# /etc/nginx/sites-available/logistix
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        # ... autres configurations proxy
    }

    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
        # ... autres configurations proxy
    }

    # Static files caching
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }

    # Logs
    access_log /var/log/nginx/logistix_access.log;
    error_log /var/log/nginx/logistix_error.log;
}
```

### Script de Déploiement Automatisé

```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

# Configuration
APP_NAME="logistix"
DEPLOY_USER="logistix"
DEPLOY_HOST="your-production-server.com"
DEPLOY_PATH="/var/www/logistix"
REPO_URL="https://github.com/your-org/logistix.git"
BRANCH="main"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Vérifications préalables
log "Starting deployment of $APP_NAME to production..."

# Vérifier la connexion au serveur
if ! ssh -o ConnectTimeout=10 $DEPLOY_USER@$DEPLOY_HOST "echo 'Connection OK'"; then
    error "Cannot connect to production server"
fi

# Créer un timestamp pour cette release
RELEASE_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RELEASE_PATH="$DEPLOY_PATH/releases/$RELEASE_TIMESTAMP"

log "Creating new release directory: $RELEASE_PATH"

# Commandes sur le serveur de production
ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
    set -e
    
    # Créer le répertoire de release
    mkdir -p $RELEASE_PATH
    
    # Cloner le code
    git clone --depth 1 --branch $BRANCH $REPO_URL $RELEASE_PATH
    
    # Aller dans le répertoire de release
    cd $RELEASE_PATH
    
    # Installer les dépendances
    npm ci --production
    
    # Build de l'application
    npm run build
    
    # Créer les liens symboliques vers les fichiers partagés
    ln -sf $DEPLOY_PATH/shared/data ./data
    ln -sf $DEPLOY_PATH/shared/logs ./logs
    ln -sf $DEPLOY_PATH/shared/.env ./.env
    
    # Exécuter les migrations de base de données
    npm run db:migrate
    
    # Tests de santé
    npm run test:health || exit 1
    
    # Mettre à jour le lien symbolique current
    ln -sfn $RELEASE_PATH $DEPLOY_PATH/current
    
    # Redémarrer l'application avec PM2
    cd $DEPLOY_PATH/current
    pm2 startOrRestart ecosystem.config.js --env production
    
    # Attendre que l'application soit prête
    sleep 10
    
    # Test de santé post-déploiement
    curl -f http://localhost:3000/api/health || exit 1
    
    # Nettoyer les anciennes releases (garder les 5 dernières)
    cd $DEPLOY_PATH/releases
    ls -t | tail -n +6 | xargs -r rm -rf
    
EOF

if [ $? -eq 0 ]; then
    log "Deployment completed successfully!"
    log "Release: $RELEASE_TIMESTAMP"
else
    error "Deployment failed!"
fi
```

### Pipeline CI/CD Production

```yaml
# .github/workflows/production.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Build application
        run: npm run build
      
      - name: Run E2E tests
        run: npm run test:e2e

  security:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security audit
        run: npm audit --audit-level high
      
      - name: Run SAST scan
        uses: github/super-linter@v4
        env:
          DEFAULT_BRANCH: main
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy:
    runs-on: ubuntu-latest
    needs: [test, security]
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.7.0
        with:
          ssh-private-key: ${{ secrets.DEPLOY_SSH_KEY }}
      
      - name: Deploy to production
        run: |
          chmod +x scripts/deploy-production.sh
          ./scripts/deploy-production.sh
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Monitoring Post-Déploiement

#### Health Checks

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/platform/database';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: 'unknown',
      memory: 'unknown',
      disk: 'unknown',
    },
  };

  try {
    // Vérification de la base de données
    const db = DatabaseService.getInstance();
    await db.raw('SELECT 1');
    checks.checks.database = 'healthy';
  } catch (error) {
    checks.checks.database = 'unhealthy';
    checks.status = 'unhealthy';
  }

  try {
    // Vérification de la mémoire
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    checks.checks.memory = memUsagePercent < 90 ? 'healthy' : 'warning';
  } catch (error) {
    checks.checks.memory = 'unhealthy';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
```

#### Monitoring avec PM2

```bash
# Installer PM2 Plus pour le monitoring
pm2 install pm2-server-monit

# Configuration du monitoring
pm2 set pm2-server-monit:refresh_rate 2000
pm2 set pm2-server-monit:port 8080

# Démarrer le monitoring
pm2 monit
```

### Rollback et Récupération

#### Procédure de Rollback

```bash
#!/bin/bash
# scripts/rollback.sh

DEPLOY_PATH="/var/www/logistix"
CURRENT_RELEASE=$(readlink $DEPLOY_PATH/current)
PREVIOUS_RELEASE=$(ls -t $DEPLOY_PATH/releases | head -2 | tail -1)

if [ -z "$PREVIOUS_RELEASE" ]; then
    echo "No previous release found for rollback"
    exit 1
fi

echo "Rolling back from $(basename $CURRENT_RELEASE) to $PREVIOUS_RELEASE"

# Mettre à jour le lien symbolique
ln -sfn $DEPLOY_PATH/releases/$PREVIOUS_RELEASE $DEPLOY_PATH/current

# Redémarrer l'application
cd $DEPLOY_PATH/current
pm2 restart logistix-prod

# Vérifier que l'application fonctionne
sleep 10
curl -f http://localhost:3000/api/health

if [ $? -eq 0 ]; then
    echo "Rollback completed successfully"
else
    echo "Rollback failed, manual intervention required"
    exit 1
fi
```

### Sécurité en Production

#### Configuration SSL/TLS

```bash
# Installation de Certbot pour Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Renouvellement automatique
sudo crontab -e
# Ajouter: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Durcissement de la Sécurité

```bash
# Configuration du pare-feu
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Désactiver l'accès root SSH
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Configuration de fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

Ce guide assure un déploiement sécurisé, fiable et reproductible de l'application Logistix en production.