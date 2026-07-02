# Portal de Gestão de Dados

Portal web para gerenciar acessos, mudanças, política de backup, testes de restore e dicionário de dados, com uma seção de Relatórios pra exportar tudo. Backend em **PHP puro — sem framework, sem Composer, sem nenhuma dependência externa** — e dados armazenados em banco de dados.

O projeto é **white-label / instalável**: não tem mais nome ou marca fixa no código. Quem instala escolhe o motor de banco, o título do projeto e o usuário administrador através de um assistente de instalação (`/setup`) — igual instalador de WordPress/phpMyAdmin. Nada disso fica "hardcoded".


## Como o projeto é organizado

```
Gestao_Dados/
├── index.php      → ponto de entrada único (dev e produção): decide se a
│                     requisição é /setup, /api/..., um arquivo estático
│                     (css/js/img) ou a página do portal
├── .htaccess       → front controller para quem usar Apache
├── setup/          → assistente de instalação (só existe ANTES de instalar;
│   └── index.php     se apaga sozinho depois que a instalação dá certo)
├── backend/        → API em PHP puro (sem framework)
│   ├── db.php        → conexão PDO multi-motor + criação das tabelas
│   ├── auth.php       → senha (bcrypt nativo) e token de login (JWT feito à mão)
│   ├── crud.php       → listar/criar/editar/excluir, genérico pros módulos
│   └── api.php        → roteador: lê a URL e chama a função certa
├── conf/
│   └── config.example.php  → modelo de referência; normalmente quem instala
│                              nem precisa abrir esse arquivo (o /setup grava
│                              o "config.php" sozinho)
├── db/             → (criado automaticamente) só existe se você escolher
│   └── database.db   SQLite no /setup; o assistente cria a pasta e o
│                      arquivo sozinho, sem você precisar informar caminho
├── css/             → estilos do portal
├── js/              → api.js fala com o backend, app.js monta as telas
└── img/             → imagens do portal (vazio por enquanto — o logo é um SVG embutido)
```

Você roda **um único processo**: o `index.php` da raiz. Ele expõe a API em `/api/...`, o assistente de instalação em `/setup` e também entrega as telas do portal. Não existe `vendor/`, não existe `composer.json` — é só PHP, sem nenhuma biblioteca externa pra instalar ou manter atualizada.

## 1. Pré-requisitos

- **PHP 8.1 ou mais novo** instalado (`php -v` no terminal). Não precisa de Composer.
- A extensão de PDO do motor de banco que você vai usar precisa estar habilitada no PHP:
  - MySQL → `pdo_mysql`
  - PostgreSQL → `pdo_pgsql`
  - SQL Server → `pdo_sqlsrv` (ver observação especial mais abaixo)
  - SQLite → `pdo_sqlite` (já vem habilitada por padrão na maioria das instalações)
  - Para checar o que já está ativo: `php -m | findstr pdo` (Windows) ou `php -m | grep pdo` (Linux/Mac).

Nenhum banco de dados é obrigatório só para testar: escolhendo SQLite no assistente de instalação (passo 3), o sistema cria a pasta `db/` e o arquivo `db/database.db` sozinho — você não informa caminho nenhum, é só selecionar o motor "SQLite" e seguir.

## 2. Rodar o portal

Na **raiz do projeto**, rode:

```bash
php -S 0.0.0.0:8000 index.php
```

Abra `http://localhost:8000` no navegador. O `index.php` da raiz é o que faz a API (`/api/...`), o assistente de instalação (`/setup`), os arquivos estáticos (`css/`, `js/`, `img/`) e as telas do portal conviverem na mesma porta. Esse mesmo arquivo é usado em produção (Apache/Nginx/IIS apontando para esta pasta) — não tem um arquivo "de desenvolvimento" diferente do "de produção".

> Esse comando usa o servidor embutido do PHP, ótimo para uso local/interno. Para expor o portal numa rede de verdade, veja o guia **[`DEPLOY.md`](./DEPLOY.md)** (Nginx, Apache ou IIS, sem Docker).

## 3. Instalar (assistente `/setup`)

Como ainda não existe `conf/config.php`, o portal te manda automaticamente para `http://localhost:8000/setup/`. Lá você preenche, num formulário só:

- **Título do projeto** — vira o nome exibido no portal (título da aba, etc.). Não é mais fixo no código.
- **Motor de banco** — MySQL, PostgreSQL, SQL Server ou SQLite.
- **Dados de conexão** (host, porta, nome do banco, usuário, senha) — só aparece para MySQL/PostgreSQL/SQL Server; tem um botão "Testar conexão" antes de instalar de fato. Escolhendo **SQLite**, esses campos somem: o assistente cria a pasta `db/` e o arquivo `db/database.db` sozinho, na raiz do projeto — zero configuração, ótimo pra testar agora.
- **Login e senha do administrador** — a conta que você vai usar para entrar no portal.

Ao clicar em "Instalar portal", o assistente grava `conf/config.php` sozinho (gera até a `secret_key` aleatória), cria as tabelas no banco escolhido, cria o usuário administrador com a senha que você definiu e **remove a própria pasta `setup/`** — por segurança, ninguém consegue reinstalar visitando `/setup` de novo depois disso.

Esse fluxo é pensado pra quando o projeto é **compartilhado/distribuído**: cada instalação escolhe seu próprio banco, título e administrador, sem editar nenhum arquivo PHP na mão.

> **Instalação manual (avançado/automação):** se preferir pular o assistente — por exemplo, num script de deploy automatizado — copie `conf/config.example.php` para `conf/config.php`, edite os valores você mesmo e suba o servidor; as tabelas são criadas na primeira requisição à API (`migrate()` em `backend/db.php`). Nesse caminho manual você precisa criar o primeiro usuário administrador direto no banco (com senha já em bcrypt) ou apagar `conf/config.php` e rodar o `/setup` normalmente.

## 4. Primeiro acesso

Depois de instalar, entre com o login e a senha de administrador que você definiu no `/setup`. Como administrador você pode criar outros usuários (aba "Usuários", antiga "Usuários do Portal") com papel `admin` (gerencia tudo, inclusive outros usuários) ou `leitura` (usa o portal mas não cria/remove contas).

## 5. O que muda em relação ao arquivo HTML original

- Os dados ficam no banco escolhido, não mais no navegador — qualquer pessoa com login acessa as mesmas informações, de qualquer máquina.
- Existe controle de acesso: login obrigatório, e só administradores gerenciam usuários.
- A visão geral agora tem dois gráficos (acessos e mudanças por status), além dos indicadores que já existiam.
- A seção "Relatórios" reúne a exportação (CSV por módulo, ou JSON completo) de todos os artefatos num só lugar.
- Os nomes de alguns campos internos mudaram para bater com o banco: o "ID" da aba Mudanças é o campo `codigo`; em Dicionário de dados, "Schema" é `schema_nome` e "Permite nulo?" é `permite_nulo`. Isso não muda nada na tela, só é bom saber se algum dia for consultar o banco direto via SQL.
- O backend não usa nenhuma biblioteca/framework — login (JWT) e senha (bcrypt) são feitos só com funções nativas do PHP, pra manter o projeto o mais simples possível de entender e manter.
- Não existe mais usuário administrador padrão criado automaticamente — quem instala escolhe login e senha do admin no `/setup`.

## 6. Dúvidas comuns

**Perdi a senha do administrador.** Não tem "resetar pelo /setup" depois de instalado (ele se recusa a rodar de novo, de propósito). Em SQLite, apague a linha do usuário na tabela `usuarios` (use qualquer cliente SQLite) e crie de novo via API, ou restaure um backup do banco. Em MySQL/PostgreSQL/SQL Server, peça pra outro administrador criar um novo login pra você na aba "Usuários", ou apague a linha do usuário em `usuarios` direto no banco e recrie com uma senha em bcrypt (`password_hash()` do PHP).

**Erro "Configuração ausente".** Normalmente não deveria aparecer, porque sem `conf/config.php` o portal te redireciona pra `/setup`. Se aparecer mesmo assim, confira se a pasta `conf/` tem permissão de escrita para o servidor web — é o que impede o assistente de gravar o arquivo.

**A pasta `setup/` ainda existe depois de eu instalar.** Acontece em alguns ambientes (geralmente IIS/Windows) onde o servidor mantém o arquivo bloqueado durante a execução, impedindo a auto-exclusão. O assistente avisa na tela de sucesso quando isso acontece — nesse caso, remova a pasta `setup/` manualmente do servidor por segurança.

**"Nenhum banco conecta" / erro de conexão mesmo com usuário/senha certos.** A causa mais comum é a extensão PDO do motor escolhido não estar habilitada no PHP — o `/setup` agora detecta isso sozinho e mostra qual extensão falta (ex.: `pdo_mysql`) em vez do erro técnico genérico "could not find driver". Pra confirmar manualmente: `php -m | grep pdo` (Linux/Mac) ou `php -m | findstr pdo` (Windows). No Windows/XAMPP, ajusta descomentando a linha correspondente (`extension=pdo_mysql`, etc.) no `php.ini` e reiniciando o servidor; em Debian/Ubuntu, `sudo apt install php-mysql` (troque "mysql" pelo motor) e reinicie o PHP-FPM/Apache. Use o botão "Testar conexão" no `/setup` pra confirmar antes de instalar.

**Onde ficam os logs de erro?** No terminal onde você rodou o `php -S` — qualquer erro da API (`error_log()` dentro de `backend/`) aparece ali. Em produção, vai para o log do PHP-FPM/Apache/IIS configurado no servidor.

## 7. Subindo em produção (ambiente real)

Este README cobre só o ambiente de desenvolvimento (rodar local com `php -S`). Para subir o portal num servidor de verdade — Nginx, Apache ou IIS, sem Docker — siga o guia separado **[`DEPLOY.md`](./DEPLOY.md)**, que cobre o assistente `/setup` em produção, configuração do servidor web, HTTPS e checklist de segurança.
