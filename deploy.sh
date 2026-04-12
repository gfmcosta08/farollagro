#!/bin/bash

# FarollAgro - Script de Deploy para VPS Hostinger
# Execute este script como root ou com sudo

set -e

echo "🐂 FarollAgro Deploy Script"
echo "=========================="

# Variáveis - ALTERE AQUI
DOMAIN="farollagro.example.com"
ADMIN_EMAIL="admin@farollagro.com"
DB_PASSWORD="CHANGE_THIS_SECURE_PASSWORD"
JWT_SECRET="CHANGE_THIS_LONG_RANDOM_SECRET"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    error "Execute este script como root (sudo su)"
    exit 1
fi

# Atualizar sistema
log "Atualizando sistema..."
apt update && apt upgrade -y

# Instalar Docker
log "Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi

# Instalar Docker Compose
log "Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Criar diretório da aplicação
log "Criando diretórios..."
mkdir -p /var/www/farollagro
mkdir -p /var/www/farollagro/ssl

# Clonar repositório
log "Clonando repositório..."
cd /var/www/farollagro
if [ -d ".git" ]; then
    warn "Repositorio ja existe, fazendo pull..."
    git pull origin main
else
    git clone https://github.com/gfmcosta08/farollagro.git .
fi

# Gerar certificados SSL
log "Gerando certificados SSL..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /var/www/farollagro/ssl/private.key \
    -out /var/www/farollagro/ssl/certificate.crt \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=FarollAgro/CN=$DOMAIN" 2>/dev/null || true

# Criar arquivo .env
log "Criando arquivo de ambiente..."
cat > /var/www/farollagro/.env << EOF
DB_USER=farollagro
DB_PASSWORD=$DB_PASSWORD
DB_NAME=farollagro
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
CLIENT_URL=https://$DOMAIN
EOF

# Build e iniciar containers
log "Construindo containers..."
cd /var/www/farollagro
docker-compose -f docker-compose.prod.yml up -d --build

# Aguardar banco de dados
log "Aguardando banco de dados..."
sleep 10

# Configurar Nginx
log "Configurando Nginx..."
cat > /etc/nginx/sites-available/farollagro << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /var/www/farollagro/ssl/certificate.crt;
    ssl_certificate_key /var/www/farollagro/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 100M;

    access_log /var/log/nginx/farollagro.access.log;
    error_log /var/log/nginx/farollagro.error.log;

    location / {
        root /var/www/farollagro/client/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }

    location /health {
        access_log off;
        return 200 "OK";
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/farollagro /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Firewall
log "Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Status final
log ""
log "=========================="
log "🐂 Deploy Concluído!"
log "=========================="
log ""
log "Acesse: https://$DOMAIN"
log "API: https://$DOMAIN/api/v1"
log ""
log "Primeiro acesso:"
log "  1. Acesse https://$DOMAIN"
log "  2. Cadastre uma conta"
log "  3. Comece a usar!"
log ""
log "Comandos úteis:"
log "  docker-compose -f docker-compose.prod.yml logs -f     # Ver logs"
log "  docker-compose -f docker-compose.prod.yml restart    # Reiniciar"
log "  docker-compose -f docker-compose.prod.yml down       # Parar"
log ""
