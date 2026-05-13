## GRUPO

Bianca Duarte Bernardo
Ellen Alves Inácio
Guilherme Marins Rodrigues
João Vitor Fernandes D'Araujo

## TECNOLOGIAS UTILIZADAS

- Backend: Node.js v20 com Express v5 e TypeScript v6
- Banco de Dados: SQLite via Prisma ORM v6
- Criptografia: Argon2 v0.44 (padrão OWASP)
- MFA/2FA: Speakeasy v2.0 e QRCode v1.5
- Segurança de Sessão: Express-Session v1.19 e Helmet v8
- Proteção de Rotas: Express-Rate-Limit v8
- Frontend: HTML5, JavaScript Vanilla e Bootstrap 5
- Arquitetura: MVC (Model-View-Controller)
---

## INSTRUÇÕES PARA EXECUÇÃO

Pre-requisito: É necessário ter o Node.js instalado na máquina.

Passo 1: Instale as dependências. Isso criará a pasta node_modules:
npm install
(confira se o terminal está na pasta correta; SI_finalizado/poc-seguranca-auth)

Passo 2: Sincronize o banco de dados. Isso gerará o arquivo local dev.db:
npx prisma db push

Passo 3: Gere o Prisma Client para as tipagens do TypeScript:
npx prisma generate

Passo 4: Inicie o servidor de desenvolvimento:
npm run dev

Passo 5: Acesse no navegador: http://localhost:3000

---

## MAPEAMENTO DOS CRITÉRIOS DE ACEITE

Abaixo consta a descrição técnica de como cada item de segurança exigido foi implementado:

### 1. Hash Seguro e Armazenamento (Itens 1.1, 1.2, 1.3 e 1.4)
- Implementação: Foi utilizado o algoritmo Argon2id.
- Justificativa de Custo: Configurou-se um custo de memória de 64MB (memoryCost: 65536) e 3 iterações (timeCost: 3). Esta configuração protege o sistema contra ataques de força bruta realizados via hardware dedicado (GPUs/ASICs), exigindo alocação de memória física para cada tentativa.
- Salt: O Argon2 gera um salt criptográfico aleatório e único para cada usuário, embutindo-o automaticamente na string final armazenada.
- Armazenamento: O banco de dados SQLite armazena o hash resultante e o segredo do 2FA de forma estruturada.

### 2. Autenticação de Dois Fatores - 2FA (Itens 1.5, 1.6 e 1.7)
- Implementação: Utilizado o padrão TOTP (Time-Based One-Time Password) via biblioteca speakeasy.
- Fluxo de Validação: A validação do 2FA ocorre estritamente após a autenticação primária (usuário e senha). O sistema utiliza um estado de sessao temporário (pending2faUserId) para impedir que o usuário acesse o dashboard antes de validar o token.

### 3. Gestão de Sessões Seguras (Itens 1.9 e 1.10)
- Tempo de Expiração: As sessões expiram automaticamente em 15 minutos, reduzindo a janela de oportunidade para ataques de sequestro de sessão.
- Invalidação: O logout realiza a destruição da sessão no servidor (req.session.destroy) e a remoção imediata do cookie no navegador do cliente.

### 4. Proteção contra Força Bruta (Item 1.11)
- Implementação: Middleware express-rate-limit aplicado nas rotas de login e validação de token.
- Regra: Limite de 5 tentativas por IP a cada 15 minutos, bloqueando requisições automatizadas excessivas.

### 5. Evidências e Justificativas (Itens 1.8 e 1.12)
- O sistema conta com uma interface de Dashboard que exibe o status da sessão validada pelo backend.
- Logs de auditoria são gerados no console do servidor a cada login bem-sucedido via MFA.

### 6. Criptografia e Comunicação Segura (Requisitos 3.1 a 3.8)
- Comunicação em Trânsito (TLS): A aplicação foi blindada instanciando o módulo https nativo do Node.js utilizando certificados X.509 gerados localmente. O HSTS (Strict-Transport-Security) foi habilitado via helmet e um servidor secundário foi criado na porta 3000 apenas para capturar e redirecionar compulsoriamente conexões HTTP inseguras para a porta criptografada 3443, neutralizando ataques de Downgrade (Req 3.1, 3.2, 3.3).
- Criptografia em Repouso: Os segredos gerados pelo Autenticador de Dois Fatores (TOTP) são caracterizados como dados sensíveis e não devem ser armazenados em texto plano. Eles foram protegidos usando criptografia simétrica com o padrão de mercado AES-256-GCM (Advanced Encryption Standard no modo Galois/Counter Mode). Este modo foi escolhido pois, além da confidencialidade, ele fornece autenticação da mensagem (Auth Tag), impedindo manipulação maliciosa do dado direto no banco de dados (Req 3.4, 3.5).
- Proteção de Chaves: A chave mestra AES de 256 bits é estritamente injetada através do arquivo local de ambiente .env, impedindo que o segredo vaze em repositórios de código-fonte (Req 3.6, 3.7, 3.8).

## 7. Arquitetura do projeto 

```
O projeto segue o padrão MVC (Model-View-Controller):
src/
├── utils/
│   └── crypto.ts          → funções de criptografia AES-256-GCM
├── models/
│   └── userModel.ts       → acesso ao banco de dados via Prisma
├── middlewares/
│   ├── security.ts        → helmet, cors, session e rate limit
│   └── auth.ts            → verificação de sessão autenticada
├── controllers/
│   ├── authController.ts  → lógica de signup, login, 2FA e logout
│   └── recoveryController.ts → lógica de recuperação de senha
├── routes/
│   ├── authRoutes.ts      → mapeamento das rotas de autenticação
│   └── dashboardRoutes.ts → rotas protegidas por sessão
└── server.ts              → inicialização do servidor HTTPS
```
