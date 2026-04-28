# Continuidade - Atualizado em 14/04/2026

## Estado atual (produção Vercel + Supabase)

### Entregas concluídas nesta rodada
- Migração frontend para Supabase nas telas de negócio (`Tags`, `Pastures`, `Lots`, `Contracts`, `Finances`, `Reports`, `Settings`).
- Proteção global contra tela branca com `ErrorBoundary` no bootstrap React.
- Fallback por tela com erro amigável e botão `Tentar novamente`.
- Correção de rota de novo animal e fluxo de aquisição integrado funcional.
- Máscara de moeda BRL no campo de valor da compra em `Novo Animal` (`R$ 0,00`).
- Cadastro/login robusto para casos de usuário parcial (recuperação automática de perfil `Tenant`/`User`).
- Ajuste da listagem de animais:
  - mostra número do brinco ativo (em vez de UUID curto);
  - linha inteira clicável para abrir detalhe;
  - botão de excluir preservado sem abrir detalhe por engano.
- Ajuste da seção de eventos no detalhe do animal:
  - substituído JSON bruto por texto legível de negócio.

### Commits relevantes já enviados para `main`
- `a38d831` - migração Supabase + fim de telas brancas.
- `1c0725f` - cadastro resiliente para múltiplas tentativas.
- `d577529` - auto-recuperação de perfil faltante no auth.
- `8c8855b` - máscara BRL no valor de aquisição.
- `3763e16` - brinco na lista + eventos legíveis.

### Validação executada
- Build frontend validado com sucesso após mudanças (`npm run build`).
- Bateria E2E via API Supabase executada:
  - signup/login: OK
  - insert/select `Tenant` + `User`: OK
  - inserts/reads em `Animal`, `Tag`, `Pasture`, `Lot`, `Contract`, `Finance`: OK

### Observações operacionais
- O deploy depende do auto-deploy da Vercel ao atualizar `main`.
- Se ocorrer erro de RLS na criação de `Tenant`, revisar políticas no schema `farollagro` e função `current_user_tenant_id()`.
- Frontend depende de:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_DB_SCHEMA=farollagro`

---
# FarollAgro - Funcionalidades a Implementar

## VisÃ£o Geral

Este documento lista as funcionalidades que nÃ£o foram implementadas na versÃ£o MVP atual e que sÃ£o necessÃ¡rias para atingir o escopo completo descrito nas especificaÃ§Ãµes originais do projeto.

---

## 1. Aplicativo Mobile (Offline-First)

**Prioridade:** ALTA

### DescriÃ§Ã£o
O aplicativo mobile Ã© um requisito existencial para uso no campo, onde a conectividade Ã© limitada ou inexistente.

### ImplementaÃ§Ã£o NecessÃ¡ria
- [ ] Banco de dados SQLite local (Room Database ou WatermelonDB)
- [ ] SincronizaÃ§Ã£o bidirecional com servidor
- [ ] ResoluÃ§Ã£o de conflitos com Last-Write-Wins (LWW)
- [ ] Fila de eventos offline com Event Sourcing
- [ ] WorkManager para sync em background
- [ ] UI otimizada para uso no curral/pasto

### Recursos
- `client/mobile/` - Estrutura para app React Native ou Flutter

---

## 2. IntegraÃ§Ã£o IoT (BalanÃ§as, RFID, Sensores)

**Prioridade:** ALTA

### DescriÃ§Ã£o
EliminaÃ§Ã£o de erros manuais atravÃ©s de automaÃ§Ã£o com dispositivos de campo.

### ImplementaÃ§Ã£o NecessÃ¡ria
- [ ] Endpoint API para recepÃ§Ã£o de dados IoT
- [ ] IntegraÃ§Ã£o WebSocket/MQTT para tempo real
- [ ] Endpoint `/api/v1/weights/automatic` para balanÃ§as
- [ ] Endpoint `/api/v1/rfid/scan` para leitores RFID
- [ ] Protocolo LoraWAN/MQTT para sensores
- [ ] ValidaÃ§Ã£o de dados de peso automÃ¡tico
- [ ] HistÃ³rico de dispositivos IoT

### Recursos
- `server/src/routes/iot.ts` - Router para IoT
- `server/src/services/iotService.ts` - LÃ³gica de IoT

---

## 3. Genealogia Recursiva com CTEs

**Prioridade:** MÃ‰DIA

### DescriÃ§Ã£o
CÃ¡lculo avanÃ§ado de pedigree com ancestors e descendents.

### ImplementaÃ§Ã£o NecessÃ¡ria
- [ ] Query SQL com Recursive CTE para ancestralidade
- [ ] Endpoint `/api/v1/animals/:id/ancestors` - 4 geraÃ§Ãµes
- [ ] Endpoint `/api/v1/animals/:id/descendants` - 4 geraÃ§Ãµes
- [ ] CÃ¡lculo de EPDs (Expected Progeny Differences)
- [ ] DetecÃ§Ã£o de consanguinidade
- [ ] IntegraÃ§Ã£o com teste de paternidade DNA/SNP

### Recursos
- `server/prisma/genealogy.sql` - Queries de genealogia
- `server/src/services/genealogyService.ts` - ServiÃ§o de pedigree

---

## 4. Rateio AutomÃ¡tico de Custos

**Prioridade:** ALTA

### DescriÃ§Ã£o
CÃ¡lculo automÃ¡tico de rateio de custos fixos (vaqueiros, cavalos) por cabeÃ§a ou hectare.

### ImplementaÃ§Ã£o NecessÃ¡ria
- [ ] Cadastro de funcionÃ¡rios com custo mensal
- [ ] Cadastro de cavalaria com custo mensal
- [ ] CÃ¡lculo de rateio por cabeÃ§a (lotaÃ§Ã£o)
- [ ] CÃ¡lculo de rateio por hectare (Ã¡rea)
- [ ] Rateio por perÃ­odo (dias no pasto)
- [ ] Cron job noturno para cÃ¡lculo DRE
- [ ] Endpoint `/api/v1/finances/dre` - DemonstraÃ§Ã£o de resultado

### Recursos
- `server/src/services/allocationService.ts` - ServiÃ§o de rateio
- `server/src/jobs/dreCalculation.ts` - Job de cÃ¡lculo DRE

---

## 5. ConversÃ£o de Unidades (Alqueire/Hectare)

**Prioridade:** MÃ‰DIA

### DescriÃ§Ã£o
ConversÃ£o automÃ¡tica conforme configuraÃ§Ã£o regional do tenant.

### ImplementaÃ§Ã£o NecessÃ¡ria
- [ ] Conversor no backend: Alqueire Paulista (2,42 ha)
- [ ] Conversor: Alqueire Mineiro (4,84 ha)
- [ ] Conversor: Alqueire Baiano (9,68 ha)
- [ ] Conversor: Metro quadrado (mÂ²)
- [ ] Middleware de conversÃ£o nas APIs de Pasture
- [ ] stored procedure no PostgreSQL

### Recursos
- `server/src/utils/unitConverter.ts` - UtilitÃ¡rio de conversÃ£o
- `server/prisma/unitConversion.sql` - Functions SQL

---

## 6. Sistema de Alertas e NotificaÃ§Ãµes

**Prioridade:** MÃ‰DIA

### DescriÃ§Ã£o
NotificaÃ§Ãµes push e alertas para manejo e deadlines.

### ImplementaÃ§Ã£o NecessÃ¡ria
- [ ] Push notifications (FCM/APNs)
- [ ] Alertas de troca de pasto (perÃ­odo de descanso expirado)
- [ ] Alertas de peso (ganho abaixo do esperado)
- [ ] Alertas sanitÃ¡rios (vacinas pendentes)
- [ ] Alertas de mortalidade (taxa acima do normal)
- [ ] IntegraÃ§Ã£o WhatsApp para alertas

### Recursos
- `server/src/services/notificationService.ts` - ServiÃ§o de notificaÃ§Ãµes
- `server/src/routes/notification.ts` - API de notificaÃ§Ãµes

---

## 7. Mapas e Georreferenciamento

**Prioridade:** BAIXA

### DescriÃ§Ã£o
VisualizaÃ§Ã£o geogrÃ¡fica das pastagens e animais.

### ImplementaÃ§Ã£o NecessÃ¡ria
- [ ] Upload de polÃ­gonos KML/Shapefile
- [ ] IntegraÃ§Ã£o Mapbox ou Google Maps API
- [ ] RenderizaÃ§Ã£o de pastos no mapa
- [ ] Tracking de animais por GPS (future)
- [ ] CÃ¡lculo de Ã¡rea automaticamente

### Recursos
- `client/src/components/Map/` - Componente de mapa
- `server/src/services/geoService.ts` - ServiÃ§o geoespacial

---

## 8. Algoritmos de Pastejo Rotacionado

**Prioridade:** BAIXA

### DescriÃ§Ã£o
CÃ¡lculo de perÃ­odos de ocupaÃ§Ã£o e descanso.

### ImplementaÃ§Ã£o NecessÃ¡ria
- [ ] Cadastro de perÃ­odo de ocupaÃ§Ã£o (PO)
- [ ] Cadastro de perÃ­odo de descanso (PD)
- [ ] CÃ¡lculo de taxa de lotaÃ§Ã£o (UA/ha)
- [ ] Alertas de rotaÃ§Ã£o de pasto
- [ ] HistÃ³rico de ocupaÃ§Ã£o por pasto
- [ ] Score de pastagem (altura, massa)

### Recursos
- `server/src/services/rotationalGrazingService.ts` - ServiÃ§o de pastejo
- `server/src/routes/grazing.ts` - API de pastejo

---

## 9. Sync Bidirecional Offline

**Prioridade:** ALTA

### DescriÃ§Ã£o
SincronizaÃ§Ã£o robusta entre app mobile e servidor.

### ImplementaÃ§Ã£o NecessÃ¡ria
- [ ] Protocolo sync com versionamento de eventos
- [ ] DetecÃ§Ã£o e resoluÃ§Ã£o de conflitos
- [ ] Exponential backoff retries
- [ ] Queue de eventos no cliente
- [ ] Batch sync para mÃºltiplos eventos
- [ ] Endpoint `/api/v1/sync/push` - Envio de eventos
- [ ] Endpoint `/api/v1/sync/pull` - Recebimento de eventos

### Recursos
- `server/src/routes/sync.ts` - API de sincronizaÃ§Ã£o
- `server/src/services/syncService.ts` - ServiÃ§o de sync

---

## 10. Dashboard BI AvanÃ§ado

**Prioridade:** MÃ‰DIA

### DescriÃ§Ã£o
Dashboards analÃ­ticos com mÃ©tricas avanÃ§adas.

### ImplementaÃ§Ã£o NecessÃ¡ria
- [ ] GrÃ¡fico de evoluÃ§Ã£o de peso por lote
- [ ] Curva de ganho mÃ©dio diÃ¡rio (GMD)
- [ ] Taxa de mortalidade por perÃ­odo
- [ ] Margem por arroba por pasto
- [ ] Comparativo entre perÃ­odos
- [ ] Benchmark entre fazendas (anonimizado)
- [ ] RelatÃ³rio PDF export

### Recursos
- `client/src/pages/Reports.tsx` - Expandir relatÃ³rios
- `server/src/services/analyticsService.ts` - ServiÃ§o de BI

---

## 11. Auditoria e Compliance

**Prioridade:** MÃ‰DIA

### DescriÃ§Ã£o
Rastreabilidade para auditorias SISBOV e export.

### ImplementaÃ§Ã£o NecessÃ¡ria
- [ ] Log de auditoria completo (audit trail)
- [ ] Imutabilidade de eventos histÃ³ricos
- [ ] Certificado de origem para animais
- [ ] ExportaÃ§Ã£o para SISBOV
- [ ] RelatÃ³rio de genealogia para certificaÃ§Ã£o
- [ ] Backup automÃ¡tico georeplicado

### Recursos
- `server/prisma/audit.sql` - Tabela de auditoria
- `server/src/middleware/audit.ts` - Middleware de auditoria

---

## 12. Multi-idioma e Acessibilidade

**Prioridade:** BAIXA

### DescriÃ§Ã£o
Suporte a diferentes idiomas e acessibilidade.

### ImplementaÃ§Ã£o NecessÃ¡ria
- [ ] i18n para portuguÃªs/inglÃªs/espanhol
- [ ] Modo alto contraste
- [ ] Leitor de tela compatÃ­vel
- [ ] Temas para daltonismo
- [ ] Fontes grandes para uso no campo

### Recursos
- `client/src/i18n/` - TraduÃ§Ãµes
- `client/src/components/Accessibility/` - Componentes acessÃ­veis

---

## PriorizaÃ§Ã£o para Desenvolvimento

### Fase 2 (PrÃ³ximos 2-3 meses)
1. Rateio AutomÃ¡tico de Custos
2. Sync Bidirecional Offline
3. App Mobile Offline-First

### Fase 3 (3-6 meses)
4. IntegraÃ§Ã£o IoT
5. Genealogia Recursiva
6. Sistema de Alertas

### Fase 4 (6+ meses)
7. Mapas Georreferenciamento
8. Algoritmos Pastejo Rotacionado
9. Dashboard BI AvanÃ§ado
10. Auditoria e Compliance

---

## Estimativas de EsforÃ§o

| Funcionalidade |complexidade | Estimativa |
|----------------|-------------|------------|
| App Mobile | Alta | 3-4 meses |
| IntegraÃ§Ã£o IoT | MÃ©dia | 1-2 meses |
| Genealogia CTE | MÃ©dia | 2-3 semanas |
| Rateio Custos | MÃ©dia | 2-3 semanas |
| ConversÃ£o Unidades | Baixa | 1 semana |
| Alertas Push | MÃ©dia | 1-2 semanas |
| Mapas | Alta | 2-3 meses |
| Pastejo Rotacionado | Alta | 2-3 meses |
| Sync Offline | Alta | 2-3 meses |
| BI Dashboard | MÃ©dia | 2-3 semanas |

---

## Tecnologias Recomendadas

### Mobile
- **React Native** ou **Flutter** para app mobile
- **WatermelonDB** ou **Realm** para banco offline
- **WorkManager** (Android) / **BGTaskScheduler** (iOS)

### IoT
- **MQTT** para comunicaÃ§Ã£o
- **WebSockets** para tempo real
- **Node-RED** para filtragem de eventos

### Maps
- **Mapbox GL JS** ou **Leaflet**
- **Turf.js** para cÃ¡lculos geoespaciais

### Background Jobs
- **node-cron** ou **agenda** para jobs
- **Bull Queue** para filas

---

## Notas

- O MVP atual Ã© funcional para uso web bÃ¡sico em VPS
- Funcionalidades mobile e IoT requerem desenvolvimento adicional
- Considere microservices para IoT em escala
- PostgreSQL RLS estÃ¡ configurado para multi-tenant

---

_Ãšltima atualizaÃ§Ã£o: $(date)_

