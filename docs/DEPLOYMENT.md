> **ℹ️ Ce guide a été consolidé. Pour les instructions essentielles, voir le [README.md](../README.md). Ce fichier détaille les procédures avancées de déploiement et d’infrastructure.**

# Guide de Déploiement - LogistiX

Ce guide détaille les différentes méthodes de déploiement de l'application LogistiX en production.

## 🎯 Vue d'Ensemble

LogistiX peut être déployé de plusieurs façons :
- **Docker** (recommandé)
- **Vercel** (pour les déploiements rapides)
- **Serveur traditionnel** (VPS/serveur dédié)
- **Cloud providers** (AWS, GCP, Azure)

## 🐳 Déploiement Docker (Recommandé)

### Prérequis

- Docker 20.0+
- Docker Compose 2.0+
- 2GB RAM minimum
- 10GB espace disque

### Configuration Docker

#### Dockerfile

```dockerfile
# Dockerfile multi-stage pour optimiser la taille
FROM node:18-alpine AS base

# Installer les dépendances système
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Stage de build
FROM base AS builder
WORKDIR /app
COPY . .

# Installer toutes les dépendances pour le build
RUN npm ci

# Build de l'application
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

# Stage de production
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Créer un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier les fichiers nécessaires
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Créer le dossier de données
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=/app/data/logistix.db
      - JWT_SECRET=${JWT_SECRET}
      - SENTRY_DSN=${SENTRY_DSN}
      - LOG_LEVEL=warn
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  redis_data:
```

#### Configuration Nginx

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # Gzip Compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

        # Static files caching
        location /_next/static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://app;
        }

        # API routes with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Login endpoint with stricter rate limiting
        location /api/v1/auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # All other requests
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Déploiement

```bash
# 1. Cloner le repository
git clone https://github.com/flavio-cbz/Logistix.git
cd Logistix

# 2. Configurer les variables d'environnement
cp .env.example .env.production
# Éditer .env.production avec vos valeurs

# 3. Construire et démarrer
docker-compose up -d --build

# 4. Vérifier le déploiement
docker-compose ps
docker-compose logs app
```

## ☁️ Déploiement Vercel

### Configuration

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "JWT_SECRET": "@jwt-secret",
    "SENTRY_DSN": "@sentry-dsn"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Déploiement

```bash
# 1. Installer Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Configurer le projet
vercel

# 4. Déployer
vercel --prod
```

## 🖥️ Serveur Traditionnel (Ubuntu/Debian)

### Prérequis

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installation PM2
sudo npm install -g pm2

# Installation Nginx
sudo apt install nginx

# Installation Certbot pour SSL
sudo apt install certbot python3-certbot-nginx
```

### Configuration PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'logistix',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/logistix',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: '/var/www/logistix/data/logistix.db',
      JWT_SECRET: 'your-jwt-secret',
      LOG_LEVEL: 'warn'
    },
    error_file: '/var/log/pm2/logistix-error.log',
    out_file: '/var/log/pm2/logistix-out.log',
    log_file: '/var/log/pm2/logistix.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### Déploiement

```bash
# 1. Cloner et configurer
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/flavio-cbz/Logistix.git logistix
cd logistix

# 2. Installation et build
sudo npm ci --only=production
sudo npm run build

# 3. Configuration des permissions
sudo chown -R www-data:www-data /var/www/logistix
sudo chmod -R 755 /var/www/logistix

# 4. Démarrer avec PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 5. Configuration Nginx
sudo nano /etc/nginx/sites-available/logistix
sudo ln -s /etc/nginx/sites-available/logistix /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 6. SSL avec Certbot
sudo certbot --nginx -d your-domain.com
```

## ☁️ Cloud Providers

### AWS (EC2 + RDS)

#### Infrastructure as Code (Terraform)

```hcl
# main.tf
provider "aws" {
  region = "eu-west-1"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "logistix-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "logistix-igw"
  }
}

# Subnets
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "logistix-public-${count.index + 1}"
  }
}

# Security Group
resource "aws_security_group" "app" {
  name_prefix = "logistix-app"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 Instance
resource "aws_instance" "app" {
  ami           = "ami-0c02fb55956c7d316" # Amazon Linux 2
  instance_type = "t3.medium"
  
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.app.id]
  associate_public_ip_address = true

  user_data = file("user-data.sh")

  tags = {
    Name = "logistix-app"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "logistix-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.app.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false
}
```

#### Script d'initialisation

```bash
#!/bin/bash
# user-data.sh

# Mise à jour du système
yum update -y

# Installation Docker
amazon-linux-extras install docker
service docker start
usermod -a -G docker ec2-user

# Installation Docker Compose
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Cloner l'application
cd /home/ec2-user
git clone https://github.com/flavio-cbz/Logistix.git
cd Logistix

# Configuration
cp .env.example .env.production
# Configurer les variables d'environnement

# Démarrage
docker-compose -f docker-compose.prod.yml up -d
```

### Google Cloud Platform

```yaml
# app.yaml (App Engine)
runtime: nodejs18

env_variables:
  NODE_ENV: production
  JWT_SECRET: your-jwt-secret
  DATABASE_URL: /tmp/logistix.db

automatic_scaling:
  min_instances: 1
  max_instances: 10
  target_cpu_utilization: 0.6

resources:
  cpu: 1
  memory_gb: 2
  disk_size_gb: 10
```

## 🔧 Configuration de Production

### Variables d'Environnement

```env
# .env.production
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Base de données
DATABASE_URL=./data/logistix.db

# Authentification
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=warn
SENTRY_DSN=https://your-sentry-dsn

# Performance
REDIS_URL=redis://redis:6379

# Sécurité
ALLOWED_ORIGINS=https://your-domain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### Optimisations de Performance

#### Next.js Configuration

```javascript
// next.config.js (production)
const nextConfig = {
  // Compression
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Headers de cache
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Redirections
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
};
```

## 📊 Monitoring et Maintenance

### Health Checks

```typescript
// app/api/v1/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    disk: await checkDiskSpace(),
    memory: await checkMemoryUsage(),
  };

  const isHealthy = Object.values(checks).every(check => check.status === 'ok');

  return Response.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
  }, {
    status: isHealthy ? 200 : 503,
  });
}
```

### Logging en Production

```typescript
// Configuration Winston pour production
const productionLogger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: '/app/logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: '/app/logs/combined.log',
      maxsize: 10485760,
      maxFiles: 5,
    }),
  ],
});
```

### Sauvegarde Automatique

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_PATH="/app/data/logistix.db"

# Créer le dossier de sauvegarde
mkdir -p $BACKUP_DIR

# Sauvegarde de la base de données
cp $DB_PATH $BACKUP_DIR/logistix_$DATE.db

# Compression
gzip $BACKUP_DIR/logistix_$DATE.db

# Nettoyage des anciennes sauvegardes (garder 30 jours)
find $BACKUP_DIR -name "logistix_*.db.gz" -mtime +30 -delete

# Upload vers S3 (optionnel)
# aws s3 cp $BACKUP_DIR/logistix_$DATE.db.gz s3://your-backup-bucket/
```

### Cron Job pour les Sauvegardes

```bash
# Ajouter au crontab
crontab -e

# Sauvegarde quotidienne à 2h du matin
0 2 * * * /path/to/backup.sh

# Nettoyage des logs hebdomadaire
0 3 * * 0 find /app/logs -name "*.log" -mtime +7 -delete
```

## 🔒 Sécurité

### SSL/TLS

```bash
# Génération de certificats Let's Encrypt
certbot certonly --webroot -w /var/www/html -d your-domain.com

# Renouvellement automatique
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### Firewall

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Fail2ban pour la protection contre les attaques
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### Secrets Management

```bash
# Utilisation de Docker Secrets
echo "your-jwt-secret" | docker secret create jwt_secret -
echo "your-db-password" | docker secret create db_password -
```

## 🚨 Dépannage

### Logs Communs

```bash
# Docker logs
docker-compose logs app
docker-compose logs nginx

# PM2 logs
pm2 logs logistix

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Application logs
tail -f /app/logs/combined.log
tail -f /app/logs/error.log
```

### Problèmes Fréquents

#### Base de Données Verrouillée

```bash
# Vérifier les processus utilisant la DB
lsof /app/data/logistix.db

# Redémarrer l'application
docker-compose restart app
```

#### Mémoire Insuffisante

```bash
# Vérifier l'utilisation mémoire
free -h
docker stats

# Augmenter la swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### Certificat SSL Expiré

```bash
# Vérifier l'expiration
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout | grep "Not After"

# Renouveler
certbot renew
sudo systemctl reload nginx
```

## 📈 Scaling

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  app:
    build: .
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
    depends_on:
      - redis
      - db

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app
```

### Load Balancing

```nginx
# nginx.conf pour load balancing
upstream app_servers {
    least_conn;
    server app_1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server app_2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server app_3:3000 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    location / {
        proxy_pass http://app_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health check
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
    }
}
```

---

Pour plus d'informations, consultez la [documentation complète](../README.md) ou créez une [issue GitHub](https://github.com/flavio-cbz/Logistix/issues).