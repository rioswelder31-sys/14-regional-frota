# 🔐 ARQUITETURA DE SEGURANÇA - Diagrama Visual

## 📐 Estrutura de Banco de Dados com Segurança

```
FIREBASE REALTIME DATABASE
│
├── 14-regional-users (Tabela de Controle)
│   ├── uid_welder_rios: true
│   ├── uid_esther_bobbio: true
│   └── uid_silvana_cardoso: true
│
├── 14-regional-admins (Tabela de Controle)
│   ├── uid_welder_rios: true
│   ├── uid_esther_bobbio: true
│   └── uid_silvana_cardoso: true
│
├── viagens (Dados da 14ª Regional)
│   ├── viagemId1: { solicitanteUID: "...", status: "Pendente" }
│   └── viagemId2: { solicitanteUID: "...", status: "Confirmado" }
│        └─ 🔐 Regra: Apenas user de 14-regional-users + admin
│
├── folgas
│   └─ 🔐 Regra: Apenas admin pode criar
│
├── equipe
│   ├── uid_usuario1: { nome: "João", telefone: "..." }
│   └─ 🔐 Regra: Apenas users podem ler, admin pode escrever
│
├── motorista
│   └─ 🔐 Regra: Apenas admin pode modificar
│
├── chat
│   ├── room_uid1_uid2: [{ texto: "...", timestamp: 123 }]
│   └─ 🔐 Regra: Apenas users autenticados podem acessar
│
├── logs
│   └─ 🔐 Regra: Apenas admin pode ler, ninguém escreve via app
│
├── unidades (Dados Multi-Regional)
│   │
│   ├── PORTO_SEGURO
│   │   ├── users: Tabela de controle
│   │   ├── admins: Tabela de controle
│   │   ├── viagens
│   │   │   └─ 🔐 Regra: Apenas users regional + admin regional
│   │   ├── folgas
│   │   ├── equipe
│   │   ├── motorista
│   │   ├── chat
│   │   └── logs
│   │
│   └── EUNAPOLIS
│       ├── users
│       ├── admins
│       ├── viagens
│       ├── folgas
│       ├── equipe
│       ├── motorista
│       ├── chat
│       └── logs
│          └─ 🔐 Regra: Apenas users EUNAPOLIS + admin EUNAPOLIS
│
├── users (Tabela Global)
│   ├── uid_usuario1: { regional: "PORTO_SEGURO", nome: "João", tipo: "user" }
│   └── uid_admin1: { regional: "EUNAPOLIS", nome: "Admin", tipo: "admin" }
│
├── admins (Tabela Global)
│   ├── uid_admin1: { regional: "EUNAPOLIS" }
│   └── uid_admin2: { regional: "PORTO_SEGURO" }
│
└── system-admins (Tabela Global)
    └── uid_welder: true
       └─ 🔐 Regra: Ninguém pode ler/escrever (apenas backend)
```

---

## 🔄 Fluxo de Autenticação e Autorização

### 1️⃣ Usuário Faz Login

```
┌─────────────────────────────────────────────────┐
│ Usuário digita email e senha                     │
│ Email: joao@defensoria.ba.def.br                │
│ Senha: ****                                     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Firebase Auth     │
        │  Valida credenciais│
        └────────┬───────────┘
                 │
         ✅ Login bem-sucedido
         │
         ├─ uid: abc123def456
         ├─ email: joao@...
         └─ token JWT
                 │
                 ▼
        ┌────────────────────────┐
        │ App armazena uid local │
        │ (localStorage)         │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │ App detecta regional   │
        │ (localStorage)         │
        │ regional: PORTO_SEGURO │
        └────────────────────────┘
```

### 2️⃣ Usuário Tenta Ler Dados

```
┌──────────────────────────────────────────┐
│ App tenta: database.ref('/viagens').on() │
└────────────────┬───────────────────────┘
                 │
    Envia com token JWT em header
                 │
                 ▼
        ┌────────────────────────────────┐
        │ Firebase Realtime Database     │
        │ Validações Simultâneas:        │
        │                                │
        │ 1. auth != null?               │
        │    ✅ Sim (token válido)       │
        │                                │
        │ 2. users[uid].regional == 15?  │
        │    Lookup: users[abc123def]    │
        │    Valor: "PORTO_SEGURO"       │
        │    ✅ SIM!                     │
        │                                │
        │ 3. Dados de PORTO_SEGURO?      │
        │    ✅ Sim (request correto)    │
        │                                │
        └────────┬─────────────────────┘
                 │
         ✅ AUTORIZADO
                 │
                 ▼
        Retorna dados de PORTO_SEGURO
        ├─ viagem1
        ├─ viagem2
        └─ viagem3
```

### 3️⃣ Tentativa de Acesso Não Autorizado

```
┌──────────────────────────────────────────────────┐
│ Usuário PORTO_SEGURO tenta ler EUNAPOLIS        │
│ database.ref('/unidades/EUNAPOLIS/viagens').on()│
└────────────────┬──────────────────────────────┘
                 │
    Envia com token JWT
    uid: abc123def456
                 │
                 ▼
        ┌──────────────────────────────────┐
        │ Firebase Realtime Database       │
        │ Validações:                      │
        │                                  │
        │ 1. auth != null?                 │
        │    ✅ Sim (token válido)         │
        │                                  │
        │ 2. users[uid].regional == path?  │
        │    Lookup: users[abc123def]      │
        │    Valor: "PORTO_SEGURO"         │
        │    Path: "EUNAPOLIS"             │
        │    ❌ NÃO - MISMATCH!            │
        │                                  │
        └────────┬─────────────────────────┘
                 │
         ❌ ACESSO NEGADO
                 │
                 ▼
        Error: Permission denied
        (A aplicação não recebe nada)
```

---

## 🛡️ Camadas de Proteção

```
                    ┌─────────────────────────┐
                    │  Browser do Usuário      │
                    │  (Client Side)           │
                    └────────┬────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
        Camada 1:   │ Autenticação App │ (Verificação local)
                    └─────┬────────────┘
                          │
                   Token JWT + UID
                          │
                          ▼
                    ┌──────────────────────────┐
                    │  Internet (HTTPS)        │
                    │  🔒 Criptografia TLS 1.2 │
                    └────────┬─────────────────┘
                             │
                             ▼
        Camada 2:   ┌──────────────────────┐
                    │ Autenticação Firebase   │ (Validação JWT)
                    │ Verifica token assinado │
                    └─────┬──────────────────┘
                          │
                          ▼
        Camada 3:   ┌──────────────────────────┐
                    │ Autorização (Regras)     │
                    │ Valida:                  │
                    │ • Autenticação           │
                    │ • Regional do usuário    │
                    │ • Tipo de acesso         │
                    │ • Estrutura de dados     │
                    └────────┬─────────────────┘
                             │
                             ▼
        Camada 4:   ┌──────────────────────────┐
                    │ Armazenamento            │
                    │ 🔒 Encriptado em repouso │
                    │ 📝 Backup automático     │
                    │ 🗄️ Múltiplas regiões    │
                    └──────────────────────────┘
```

---

## 📊 Matriz de Permissões Detalhada

### 14ª Regional

```
╔════════════════════╦══════════════╦═════════════════════╗
║ Recurso            ║ Usuário      ║ Admin               ║
╠════════════════════╬══════════════╬═════════════════════╣
║ viagens (LER)      ║ ✅ Próprias  ║ ✅ Todas            ║
║ viagens (CRIAR)    ║ ✅ Sim       ║ ✅ Sim              ║
║ viagens (EDITAR)   ║ ✅ Própria   ║ ✅ Qualquer         ║
║ viagens (DELETAR)  ║ ❌ Não       ║ ❌ Não              ║
╠════════════════════╬══════════════╬═════════════════════╣
║ folgas (LER)       ║ ✅ Sim       ║ ✅ Sim              ║
║ folgas (CRIAR)     ║ ❌ Não       ║ ✅ Sim              ║
║ folgas (EDITAR)    ║ ❌ Não       ║ ✅ Sim              ║
║ folgas (DELETAR)   ║ ❌ Não       ║ ❌ Não              ║
╠════════════════════╬══════════════╬═════════════════════╣
║ equipe (LER)       ║ ✅ Sim       ║ ✅ Sim              ║
║ equipe (CRIAR)     ║ ❌ Não       ║ ✅ Sim              ║
║ equipe (EDITAR)    ║ ❌ Não       ║ ✅ Sim              ║
║ equipe (DELETAR)   ║ ❌ Não       ║ ✅ Sim              ║
╠════════════════════╬══════════════╬═════════════════════╣
║ chat (LER)         ║ ✅ Sim       ║ ✅ Sim              ║
║ chat (ESCREVER)    ║ ✅ Sim       ║ ✅ Sim              ║
║ chat (DELETAR)     ║ ❌ Não       ║ ❌ Não              ║
╠════════════════════╬══════════════╬═════════════════════╣
║ motorista (LER)    ║ ✅ Sim       ║ ✅ Sim              ║
║ motorista (EDITAR) ║ ❌ Não       ║ ✅ Sim              ║
╠════════════════════╬══════════════╬═════════════════════╣
║ logs (LER)         ║ ❌ Não       ║ ✅ Sim              ║
║ logs (ESCREVER)    ║ ❌ Não       ║ ❌ App apenas       ║
╚════════════════════╩══════════════╩═════════════════════╝
```

---

## 🔄 Fluxo de Criação de Nova Viagem

```
1. Usuário preenche formulário
   ├─ Solicitante: "João Silva"
   ├─ Saída: "2026-04-15 08:00"
   ├─ Chegada: "2026-04-15 17:00"
   └─ Roteiro: [...]

2. App valida localmente
   ├─ Campos não vazios? ✅
   ├─ Datas válidas? ✅
   └─ Roteiro com trechos? ✅

3. App envia para Firebase
   POST /viagens {
     solicitanteNome: "João Silva",
     solicitanteUID: "abc123",
     saida: "2026-04-15T08:00:00Z",
     chegada: "2026-04-15T17:00:00Z",
     status: "Pendente",
     roteiroArray: [...]
   }
   Header: Authorization: Bearer {JWT}

4. Firebase recebe a requisição
   ├─ Valida JWT? ✅
   ├─ Usuário autenticado? ✅
   ├─ users[abc123].regional === "14-regional"? ✅
   ├─ newData tem campo 'solicitanteNome'? ✅
   ├─ newData tem campo 'solicitanteUID'? ✅
   ├─ newData tem campo 'saida'? ✅
   ├─ newData tem campo 'chegada'? ✅
   ├─ newData tem campo 'status'? ✅
   └─ Todas as validações passaram? ✅ ESCREVER!

5. Dados salvos com sucesso
   ├─ Timestamp: 2026-04-14T12:30:00Z
   ├─ Criptografado
   ├─ Backup automático
   └─ Auditado em logs

6. App recebe confirmação
   ├─ Novo ID: "viagem_xyz789"
   ├─ Status: "success"
   └─ Toast: "Viagem salva com sucesso!"
```

---

## 🚨 Fluxo de Tentativa de Invasão

```
1. Hacker descobre URL
   URL Público: https://frota14regional-8fecc-default-rtdb.firebaseio.com

2. Tenta acessar sem autenticação
   GET /viagens.json
   
3. Firebase recebe a requisição
   ├─ Valida JWT? ❌ Nenhum JWT fornecido
   └─ Autenticado? ❌ NÃO
   
4. Firebase checa a regra
   ".read": "auth != null && ..."
   ├─ auth != null? ❌ FALSO
   └─ Acesso NEGADO

5. Hacker recebe erro
   {
     "error": "Permission denied"
   }
   HTTP 401 Unauthorized

6. Tentativa de escrita sem auth
   POST /viagens.json
   { solicitanteNome: "Hacker", ... }
   
7. Firebase recebe
   ├─ Autenticado? ❌ NÃO
   └─ Escrita NEGADA
   
8. Hacker recebe erro
   {
     "error": "Permission denied"
   }
   HTTP 401 Unauthorized

9. Hacker desiste
   ✅ Sistema seguro - Sem danos
```

---

## 📈 Antes vs. Depois - Visualização

```
┌─────────────────────────────────────────┐
│ ANTES (Inseguro)                        │
│                                         │
│ Hacker                                  │
│   │                                     │
│   ├─ Lê tudo (✅ sem auth)              │
│   ├─ Escreve tudo (✅ sem controle)    │
│   ├─ Deleta tudo (✅ sem restrição)    │
│   └─ Custa muito (❌ R$$$)             │
│                                         │
│ Resultado: 💥 DESASTRE                 │
└─────────────────────────────────────────┘

                    ▼ MIGRAÇÃO ▼

┌─────────────────────────────────────────┐
│ DEPOIS (Seguro)                         │
│                                         │
│ Hacker                                  │
│   │                                     │
│   ├─ Tenta ler (❌ Permission denied)  │
│   ├─ Tenta escrever (❌ Permission denied) │
│   ├─ Tenta deletar (❌ Permission denied)  │
│   └─ Sem acesso, sem custos (✅ $0)    │
│                                         │
│ Resultado: ✅ SEGURO                   │
└─────────────────────────────────────────┘
```

---

**Arquitetura Final: ✅ Segura, Escalável e em Conformidade com LGPD**
