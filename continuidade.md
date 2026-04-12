# FarollAgro - Funcionalidades a Implementar

## Visão Geral

Este documento lista as funcionalidades que não foram implementadas na versão MVP atual e que são necessárias para atingir o escopo completo descrito nas especificações originais do projeto.

---

## 1. Aplicativo Mobile (Offline-First)

**Prioridade:** ALTA

### Descrição
O aplicativo mobile é um requisito existencial para uso no campo, onde a conectividade é limitada ou inexistente.

### Implementação Necessária
- [ ] Banco de dados SQLite local (Room Database ou WatermelonDB)
- [ ] Sincronização bidirecional com servidor
- [ ] Resolução de conflitos com Last-Write-Wins (LWW)
- [ ] Fila de eventos offline com Event Sourcing
- [ ] WorkManager para sync em background
- [ ] UI otimizada para uso no curral/pasto

### Recursos
- `client/mobile/` - Estrutura para app React Native ou Flutter

---

## 2. Integração IoT (Balanças, RFID, Sensores)

**Prioridade:** ALTA

### Descrição
Eliminação de erros manuais através de automação com dispositivos de campo.

### Implementação Necessária
- [ ] Endpoint API para recepção de dados IoT
- [ ] Integração WebSocket/MQTT para tempo real
- [ ] Endpoint `/api/v1/weights/automatic` para balanças
- [ ] Endpoint `/api/v1/rfid/scan` para leitores RFID
- [ ] Protocolo LoraWAN/MQTT para sensores
- [ ] Validação de dados de peso automático
- [ ] Histórico de dispositivos IoT

### Recursos
- `server/src/routes/iot.ts` - Router para IoT
- `server/src/services/iotService.ts` - Lógica de IoT

---

## 3. Genealogia Recursiva com CTEs

**Prioridade:** MÉDIA

### Descrição
Cálculo avançado de pedigree com ancestors e descendents.

### Implementação Necessária
- [ ] Query SQL com Recursive CTE para ancestralidade
- [ ] Endpoint `/api/v1/animals/:id/ancestors` - 4 gerações
- [ ] Endpoint `/api/v1/animals/:id/descendants` - 4 gerações
- [ ] Cálculo de EPDs (Expected Progeny Differences)
- [ ] Detecção de consanguinidade
- [ ] Integração com teste de paternidade DNA/SNP

### Recursos
- `server/prisma/genealogy.sql` - Queries de genealogia
- `server/src/services/genealogyService.ts` - Serviço de pedigree

---

## 4. Rateio Automático de Custos

**Prioridade:** ALTA

### Descrição
Cálculo automático de rateio de custos fixos (vaqueiros, cavalos) por cabeça ou hectare.

### Implementação Necessária
- [ ] Cadastro de funcionários com custo mensal
- [ ] Cadastro de cavalaria com custo mensal
- [ ] Cálculo de rateio por cabeça (lotação)
- [ ] Cálculo de rateio por hectare (área)
- [ ] Rateio por período (dias no pasto)
- [ ] Cron job noturno para cálculo DRE
- [ ] Endpoint `/api/v1/finances/dre` - Demonstração de resultado

### Recursos
- `server/src/services/allocationService.ts` - Serviço de rateio
- `server/src/jobs/dreCalculation.ts` - Job de cálculo DRE

---

## 5. Conversão de Unidades (Alqueire/Hectare)

**Prioridade:** MÉDIA

### Descrição
Conversão automática conforme configuração regional do tenant.

### Implementação Necessária
- [ ] Conversor no backend: Alqueire Paulista (2,42 ha)
- [ ] Conversor: Alqueire Mineiro (4,84 ha)
- [ ] Conversor: Alqueire Baiano (9,68 ha)
- [ ] Conversor: Metro quadrado (m²)
- [ ] Middleware de conversão nas APIs de Pasture
- [ ] stored procedure no PostgreSQL

### Recursos
- `server/src/utils/unitConverter.ts` - Utilitário de conversão
- `server/prisma/unitConversion.sql` - Functions SQL

---

## 6. Sistema de Alertas e Notificações

**Prioridade:** MÉDIA

### Descrição
Notificações push e alertas para manejo e deadlines.

### Implementação Necessária
- [ ] Push notifications (FCM/APNs)
- [ ] Alertas de troca de pasto (período de descanso expirado)
- [ ] Alertas de peso (ganho abaixo do esperado)
- [ ] Alertas sanitários (vacinas pendentes)
- [ ] Alertas de mortalidade (taxa acima do normal)
- [ ] Integração WhatsApp para alertas

### Recursos
- `server/src/services/notificationService.ts` - Serviço de notificações
- `server/src/routes/notification.ts` - API de notificações

---

## 7. Mapas e Georreferenciamento

**Prioridade:** BAIXA

### Descrição
Visualização geográfica das pastagens e animais.

### Implementação Necessária
- [ ] Upload de polígonos KML/Shapefile
- [ ] Integração Mapbox ou Google Maps API
- [ ] Renderização de pastos no mapa
- [ ] Tracking de animais por GPS (future)
- [ ] Cálculo de área automaticamente

### Recursos
- `client/src/components/Map/` - Componente de mapa
- `server/src/services/geoService.ts` - Serviço geoespacial

---

## 8. Algoritmos de Pastejo Rotacionado

**Prioridade:** BAIXA

### Descrição
Cálculo de períodos de ocupação e descanso.

### Implementação Necessária
- [ ] Cadastro de período de ocupação (PO)
- [ ] Cadastro de período de descanso (PD)
- [ ] Cálculo de taxa de lotação (UA/ha)
- [ ] Alertas de rotação de pasto
- [ ] Histórico de ocupação por pasto
- [ ] Score de pastagem (altura, massa)

### Recursos
- `server/src/services/rotationalGrazingService.ts` - Serviço de pastejo
- `server/src/routes/grazing.ts` - API de pastejo

---

## 9. Sync Bidirecional Offline

**Prioridade:** ALTA

### Descrição
Sincronização robusta entre app mobile e servidor.

### Implementação Necessária
- [ ] Protocolo sync com versionamento de eventos
- [ ] Detecção e resolução de conflitos
- [ ] Exponential backoff retries
- [ ] Queue de eventos no cliente
- [ ] Batch sync para múltiplos eventos
- [ ] Endpoint `/api/v1/sync/push` - Envio de eventos
- [ ] Endpoint `/api/v1/sync/pull` - Recebimento de eventos

### Recursos
- `server/src/routes/sync.ts` - API de sincronização
- `server/src/services/syncService.ts` - Serviço de sync

---

## 10. Dashboard BI Avançado

**Prioridade:** MÉDIA

### Descrição
Dashboards analíticos com métricas avançadas.

### Implementação Necessária
- [ ] Gráfico de evolução de peso por lote
- [ ] Curva de ganho médio diário (GMD)
- [ ] Taxa de mortalidade por período
- [ ] Margem por arroba por pasto
- [ ] Comparativo entre períodos
- [ ] Benchmark entre fazendas (anonimizado)
- [ ] Relatório PDF export

### Recursos
- `client/src/pages/Reports.tsx` - Expandir relatórios
- `server/src/services/analyticsService.ts` - Serviço de BI

---

## 11. Auditoria e Compliance

**Prioridade:** MÉDIA

### Descrição
Rastreabilidade para auditorias SISBOV e export.

### Implementação Necessária
- [ ] Log de auditoria completo (audit trail)
- [ ] Imutabilidade de eventos históricos
- [ ] Certificado de origem para animais
- [ ] Exportação para SISBOV
- [ ] Relatório de genealogia para certificação
- [ ] Backup automático georeplicado

### Recursos
- `server/prisma/audit.sql` - Tabela de auditoria
- `server/src/middleware/audit.ts` - Middleware de auditoria

---

## 12. Multi-idioma e Acessibilidade

**Prioridade:** BAIXA

### Descrição
Suporte a diferentes idiomas e acessibilidade.

### Implementação Necessária
- [ ] i18n para português/inglês/espanhol
- [ ] Modo alto contraste
- [ ] Leitor de tela compatível
- [ ] Temas para daltonismo
- [ ] Fontes grandes para uso no campo

### Recursos
- `client/src/i18n/` - Traduções
- `client/src/components/Accessibility/` - Componentes acessíveis

---

## Priorização para Desenvolvimento

### Fase 2 (Próximos 2-3 meses)
1. Rateio Automático de Custos
2. Sync Bidirecional Offline
3. App Mobile Offline-First

### Fase 3 (3-6 meses)
4. Integração IoT
5. Genealogia Recursiva
6. Sistema de Alertas

### Fase 4 (6+ meses)
7. Mapas Georreferenciamento
8. Algoritmos Pastejo Rotacionado
9. Dashboard BI Avançado
10. Auditoria e Compliance

---

## Estimativas de Esforço

| Funcionalidade |complexidade | Estimativa |
|----------------|-------------|------------|
| App Mobile | Alta | 3-4 meses |
| Integração IoT | Média | 1-2 meses |
| Genealogia CTE | Média | 2-3 semanas |
| Rateio Custos | Média | 2-3 semanas |
| Conversão Unidades | Baixa | 1 semana |
| Alertas Push | Média | 1-2 semanas |
| Mapas | Alta | 2-3 meses |
| Pastejo Rotacionado | Alta | 2-3 meses |
| Sync Offline | Alta | 2-3 meses |
| BI Dashboard | Média | 2-3 semanas |

---

## Tecnologias Recomendadas

### Mobile
- **React Native** ou **Flutter** para app mobile
- **WatermelonDB** ou **Realm** para banco offline
- **WorkManager** (Android) / **BGTaskScheduler** (iOS)

### IoT
- **MQTT** para comunicação
- **WebSockets** para tempo real
- **Node-RED** para filtragem de eventos

### Maps
- **Mapbox GL JS** ou **Leaflet**
- **Turf.js** para cálculos geoespaciais

### Background Jobs
- **node-cron** ou **agenda** para jobs
- **Bull Queue** para filas

---

## Notas

- O MVP atual é funcional para uso web básico em VPS
- Funcionalidades mobile e IoT requerem desenvolvimento adicional
- Considere microservices para IoT em escala
- PostgreSQL RLS está configurado para multi-tenant

---

_Última atualização: $(date)_
