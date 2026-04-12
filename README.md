# FarollAgro - SaaS de Gestão Pecuária de Precisão

Plataforma completa para gestão de fazendas de gado de corte e leite, com rastreabilidade individual, controle financeiro, gestão de pastagens e muito mais.

## Funcionalidades Principais

- **Gestão de Animais**: Cadastro individual com UUID, genealogia, histórico completo
- **Brincos/Botoeiras**: Sistema de reutilização com histórico temporal
- **Pastagens**: Cadastro georreferenciado com controle de lotação
- **Lotes Zootécnicos**: Agrupamento de animais para manejo
- **Contratos de Pastagem**: Aluguel por cabeça, área ou valor fixo
- **Finanças**: Controle de receitas e despesas com rateio
- **Relatórios**: Dashboard com métricas e análises
- **Multi-tenant**: Isolamento total de dados entre fazendas
- **Offline-First**: Funciona sem internet no campo

## Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│    API      │────▶│  PostgreSQL │
│  (React)    │     │  (Node.js)  │     │   + RLS     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │   (Cache)   │
                    └─────────────┘
```

## Stack Tecnológica

- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Database**: PostgreSQL 15 (com Row-Level Security)
- **Cache**: Redis 7
- **Proxy**: Nginx

## Deploy na VPS (Hostinger)

### Pré-requisitos

- VPS com Ubuntu 22.04+
- Docker e Docker Compose instalados
- Nginx (já incluso no droplet Hostinger)
- Domínio configurado (opcional)

### Passo a Passo

#### 1. Clone o projeto
```bash
cd /var/www
git clone https://github.com/seu-usuario/farollagro.git
cd farollagro
```

#### 2. Configure as variáveis de ambiente
```bash
cp .env.example .env
nano .env  # Edite com suas configurações
```

#### 3. Gere os certificados SSL (necessário para HTTPS)
```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/private.key -out ssl/certificate.crt \
  -subj "/C=BR/ST=SP/L=SaoPaulo/O=FarollAgro/CN=your-domain.com"
```

#### 4. Build e inicie os containers
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

#### 5. Verifique os logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

#### 6. Acesse a aplicação
- Frontend: `http://seu-ip`
- API: `http://seu-ip/api/v1`

## Desenvolvimento Local

### Backend
```bash
cd server
npm install
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

### Database
```bash
cd server
docker-compose up db -d
npx prisma migrate dev
npx prisma db seed
```

## API Endpoints

### Autenticação
- `POST /api/v1/auth/register` - Cadastro
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Usuário logado

### Animais
- `GET /api/v1/animals` - Listar
- `GET /api/v1/animals/:id` - Detalhes
- `POST /api/v1/animals` - Criar
- `PUT /api/v1/animals/:id` - Atualizar
- `POST /api/v1/animals/:id/tags` - Vincular brinco
- `POST /api/v1/animals/:id/purchase` - Registrar compra
- `POST /api/v1/animals/:id/sale` - Registrar venda
- `POST /api/v1/animals/:id/death` - Registrar morte

### Brincos
- `GET /api/v1/tags` - Listar
- `POST /api/v1/tags` - Criar
- `POST /api/v1/tags/batch` - Criar em lote
- `GET /api/v1/tags/search/:query` - Buscar por número/RFID

### Pastos
- `GET /api/v1/pastures` - Listar
- `POST /api/v1/pastures` - Criar

### Lotes
- `GET /api/v1/lots` - Listar
- `POST /api/v1/lots` - Criar
- `POST /api/v1/lots/:id/animals` - Adicionar animal

### Contratos
- `GET /api/v1/contracts` - Listar
- `POST /api/v1/contracts` - Criar
- `GET /api/v1/contracts/:id/billing` - Calcular cobrança

### Finanças
- `GET /api/v1/finances` - Listar
- `POST /api/v1/finances` - Criar
- `GET /api/v1/finances/summary/monthly` - Resumo mensal

### Relatórios
- `GET /api/v1/reports/dashboard` - Dashboard
- `GET /api/v1/reports/finances/summary` - Resumo financeiro
- `GET /api/v1/reports/pastures/occupancy` - Ocupação de pastos
- `GET /api/v1/reports/animals/mortality` - Mortalidade

## Modelo de Dados

### Animal
- UUID imutável como identificador principal
- Tags vinculadas através de tabela histórica (AnimalTag)
- Genealogia com autorrelacionamento (sire/dam)

### Tag
- Número legível reutilizável
- Histórico temporal de vínculos
- Status: AVAILABLE, ACTIVE, LOST, DAMAGED

### Pasture
- Área sempre em hectares (conversão automática)
- Capacidade em UA (Unidades Animais)

### Contract
- Tipos de cobrança: PER_HEAD, PER_AREA, FIXED, HYBRID
- Ciclos: DAILY, WEEKLY, MONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL

## Segurança

- Row-Level Security (RLS) no PostgreSQL
- Autenticação JWT
- Rate limiting na API
- Helmet.js para headers de segurança
- Isolamento total entre tenants

## Monitoramento

```bash
# Ver status dos containers
docker-compose ps

# Ver uso de recursos
docker stats

# Logs da API
docker-compose logs api

# Logs do banco
docker-compose logs postgres
```

## Troubleshooting

### Container não inicia
```bash
docker-compose logs [service]
docker-compose restart [service]
```

### Problema de conexão com banco
```bash
docker-compose exec postgres psql -U farollagro -d farollagro
```

### Rebuild completo
```bash
docker-compose down -v
docker-compose up -d --build
```

## License

MIT
