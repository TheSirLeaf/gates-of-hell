# Guia de setup — Gates of Hell

Este guia leva você do zero até o site no ar, **sem pagar nada** e sem instalar nada no seu computador
(a menos que queira testar localmente — passo 7, opcional).

Você vai usar três serviços gratuitos:

| Serviço | Para quê | Custo |
| --- | --- | --- |
| **GitHub** | guarda o código | grátis |
| **Supabase** | banco de dados, login e tempo real (chat/fichas ao vivo) | grátis |
| **Cloudflare Pages** | hospeda o site | grátis |

Tempo estimado: 20–30 minutos.

> **Resumo do que acontece:** o site (feito em React) roda no navegador de cada jogador. Ele fala direto com o
> Supabase, que guarda fichas, classes, inventário, bestiário e o chat. As regras de quem pode ver/editar o quê
> ficam **dentro do banco** (RLS), então um jogador não consegue ver a ficha do outro nem mexer em coisas do mestre.

---

## 1. Ter o código no GitHub

1. Crie uma conta em <https://github.com> (se ainda não tiver).
2. O código já está num repositório. Se o repositório estiver na conta de outra pessoa, peça para ela
   **transferir** ou faça um **fork** (botão *Fork* no topo da página do repositório) para a sua conta.

## 2. Criar o projeto no Supabase

1. Entre em <https://supabase.com> → **Start your project** → faça login com o GitHub.
2. **New project** (se pedir, crie uma *Organization* — pode ser só o seu nome, plano **Free**).
3. Preencha:
   - **Name:** `gates-of-hell`
   - **Database Password:** clique em *Generate* e **guarde** (você quase nunca vai precisar dela).
   - **Region:** a mais próxima (para o Brasil: *South America (São Paulo)*).
   - **Plan:** Free.
4. Clique **Create new project** e espere ~2 minutos.

## 3. Criar as tabelas (banco de dados)

1. No menu lateral do Supabase, abra **SQL Editor** → **New query**.
2. Abra o arquivo [`supabase/migrations/001_schema.sql`](../supabase/migrations/001_schema.sql) no GitHub, clique em
   **Copy raw file**, cole no editor e clique em **Run**. Deve aparecer *Success. No rows returned*.
3. Repita com [`supabase/migrations/002_seed_classes.sql`](../supabase/migrations/002_seed_classes.sql).
   Ele cadastra as 5 classes (Guerreiro, Atirador, Lutador, Assassino, Escudeiro).
   **Rode este uma vez só** — rodar de novo sobrescreve edições que você tiver feito nas classes.

Para conferir: **Table Editor** deve listar `profiles`, `classes`, `characters`, `inventory_items`,
`monsters` e `messages`.

## 4. Configurar o login

1. **Authentication → Sign In / Providers → Email** (em alguns painéis: *Authentication → Providers → Email*).
2. Deixe **Enable Email provider** ligado e **desligue "Confirm email"**.
   Assim os jogadores entram assim que criam a conta, sem precisar confirmar por e-mail
   (o envio de e-mail do plano grátis é limitado e atrapalha mesa de jogo).
3. Salve.

> Os jogadores podem usar qualquer e-mail (ele só serve de login). Não é enviado nada para ele.

**Se preferir manter "Confirm email" ligado:** em **Authentication → URL Configuration**, coloque o endereço do site
(ex.: `https://gates-of-hell.SEU-USUARIO.workers.dev`) em **Site URL** e também em **Redirect URLs**. Sem isso, o link do e-mail
abre `localhost` e a confirmação "não funciona". O site já mostra a mensagem de confirmação e tem o botão
**Reenviar e-mail**. Atenção: o e-mail grátis do Supabase tem limite de poucos envios por hora.

## 5. Pegar as chaves do Supabase

1. **Project Settings** (engrenagem) → **API** (ou *Data API / API Keys*).
2. Copie dois valores:
   - **Project URL** — algo como `https://abcdefgh.supabase.co`
   - **anon public key** (também chamada *publishable key*) — uma chave longa.

Essas duas **podem** ficar no site (são públicas; a segurança vem do RLS do passo 3).

> ⚠️ **Nunca** use nem copie a chave **`service_role`** (ou *secret*) em lugar nenhum deste projeto.

## 6. Publicar o site na Cloudflare Pages

1. Crie conta em <https://dash.cloudflare.com/sign-up> (grátis, não precisa cadastrar cartão).
2. Menu **Workers & Pages** → **Create** → aba **Pages** → **Connect to Git**.
3. Autorize o GitHub e escolha o repositório do projeto.
4. Configure o build:

   | Campo | Valor |
   | --- | --- |
   | Production branch | `main` |
   | Framework preset | `None` (ou *Vite*) |
   | **Root directory** | `web` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

5. Em **Environment variables**, adicione (aba *Production*):

   | Nome | Valor |
   | --- | --- |
   | `VITE_SUPABASE_URL` | o *Project URL* do passo 5 |
   | `VITE_SUPABASE_ANON_KEY` | a *anon public key* do passo 5 |
   | `NODE_VERSION` | `20` |

6. **Save and Deploy**. Em 1–2 minutos você ganha um endereço `https://gates-of-hell.pages.dev`
   (ou parecido). Esse é o site — mande o link para a mesa.

Daqui para frente, **todo commit na branch `main` publica sozinho**.

> Se você mudar as variáveis depois, é preciso fazer um novo deploy
> (*Deployments → ⋯ → Retry deployment*), porque elas são embutidas na hora do build.

## 7. (Opcional) Rodar no seu computador

Precisa do [Node.js 20+](https://nodejs.org).

```bash
cd web
cp .env.example .env.local     # edite e cole a URL e a anon key
npm install
npm run dev                    # abre em http://localhost:5173
```

Outros comandos úteis: `npm test` (testa o motor de dados) e `npm run build`.

## 8. Virar o Mestre

Qualquer pessoa que cria conta entra como **Jogador**. Para ser **Mestre**:

1. Abra o site e **crie a sua conta** normalmente.
2. No Supabase → **SQL Editor**, rode (trocando pelo seu e-mail):

   ```sql
   update public.profiles
   set role = 'master'
   where id = (select id from auth.users where email = 'SEU-EMAIL@exemplo.com');
   ```

3. Recarregue o site. Aparecem as abas **Classes** e **Bestiário**, e você passa a ver as fichas de todos.

Só quem tem acesso ao painel do Supabase consegue promover alguém — não existe código secreto
vazando no site. Para ter um segundo mestre, repita o comando com o e-mail dele.

## 8.1. Admin (quem mantém o sistema, sem ser o mestre)

O papel **Admin** é para quem cuida do site mas **não joga como mestre** (ex.: você, desenvolvedor).
Ele usa o site como jogador comum — **não vê** fichas dos outros, o bestiário nem as rolagens secretas —
até ligar o **Modo suporte** (interruptor na barra lateral).

1. Rode a migração [`supabase/migrations/003_admin_forge.sql`](../supabase/migrations/003_admin_forge.sql) no SQL Editor
   (depois do 001 e do 002).
2. Torne a sua conta admin (trocando o e-mail):

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'SEU-EMAIL@exemplo.com');
   ```

   Se você tinha virado `master` pelo passo 8, isso troca o seu papel para admin. Use então a aba **Admin** do site
   para promover o mestre de verdade (ou rode o comando do passo 8 com o e-mail dele).
3. Rode também [`supabase/migrations/004_admin_accounts.sql`](../supabase/migrations/004_admin_accounts.sql) (gestão de contas).
4. Recarregue o site: aparecem o interruptor **Modo suporte** e a aba **Admin**.

**Aba Admin — gestão de contas:** lista todas as pessoas (e-mail, papel, fichas, último acesso) com busca e filtros.
Ao abrir uma conta você pode: trocar o papel (jogador/mestre), renomear, **definir uma senha temporária** (para quem esqueceu),
**bloquear/desbloquear** o login e **excluir** a conta (apaga fichas, inventário, mensagens e forjas; exige digitar o nome).
Contas de admin não podem ser alteradas por aqui. Cada ação fica no registro de atividade que o mestre vê.

**Transparência para o mestre:** ao ligar o modo suporte, o mestre recebe um aviso fixo no topo e notificações em tempo real
a cada ficha, inventário, classe, monstro ou chat que você abrir/alterar. O histórico fica na aba **Atividade** do mestre.
As alterações são registradas **pelo próprio banco** (não dá para burlar pelo site); as aberturas de telas são
registradas pelo site.

## 9. Como usar (resumo para a mesa)

- **Jogador:** cria conta → **Fichas → Nova ficha** → escolhe classe, distribui atributos e perícias,
  clica em **Rolar iniciais** para Vida/Postura/Stamina, escolhe a armadura e adiciona armas no inventário.
  Tudo salva sozinho.
- **Chat e rolagens:** painel à direita (botão *Chat* no celular). Exemplos:
  - `/r 3d20kh1+2 Luta` — rolagem pública
  - `/s d20` — rolagem **secreta** (só você e o mestre veem)
  - `[d20+5 ataque] [2d6+3 dano]` — várias de uma vez
  - Sem barra, é só conversa. Os botões 🎲 e **Dano** da ficha rolam por você.
- **Forja:** aba **Forja** — monte a receita (arma, raridade, metal, componentes), golpeie no tempo certo e o resultado
  vai **automaticamente para o mestre** (cartão no chat + aba *Histórico*). Dá para guardar a peça no inventário.
- **Mestre:** edita qualquer ficha, cria/edita classes, mantém o bestiário, acompanha as forjas e pode **Limpar** o chat.

## 9.1. Usar no celular (instalar como app)

O site é um **PWA**: instala no celular como um app de verdade (ícone próprio, tela cheia, sem barra do navegador).
Não precisa de loja de apps.

- **Android (Chrome):** abra o site → menu **Mais** (barra inferior) → **Instalar como app**.
  (Ou menu do Chrome ⋮ → *Instalar app*.)
- **iPhone (Safari):** abra o site → botão **Compartilhar** → **Adicionar à Tela de Início**.

Dicas: a **Forja** vira tela cheia ao jogar (toque em qualquer ponto para golpear) e, na ficha, a faixa fixa no topo
ajusta Vida/Postura/Stamina sem rolar a página. É preciso internet para usar (os dados ficam no Supabase).

## 10. Manutenção e limites do plano grátis

- **Pausa por inatividade:** projetos grátis do Supabase **pausam após ~7 dias sem uso**. Se o site parar de
  responder, entre em <https://supabase.com/dashboard> e clique em **Restore project**. Os dados não são perdidos.
  Usar a mesa semanalmente já evita a pausa.
- **Tamanho:** o banco grátis tem 500 MB — fichas e chat de uma mesa de amigos ocupam uma fração mínima.
  Se quiser, o Mestre usa **Limpar** no chat de vez em quando.
- **Backup:** *Table Editor → (tabela) → Export to CSV*, ou *Database → Backups* (no plano grátis os backups
  automáticos não são baixáveis; exporte as tabelas `characters`, `classes` e `inventory_items` de vez em quando).
- **Atualizar o site:** edite o código e faça commit na `main`; a Cloudflare republica.
- **Mudou o banco?** Novas versões do sistema vêm com novos arquivos em `supabase/migrations/` — rode no SQL Editor
  na ordem dos números.

## 11. Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| Tela “Falta conectar o Supabase” | Variáveis `VITE_...` ausentes/erradas; corrija e faça novo deploy. |
| “Não encontrei seu perfil” após login | O `001_schema.sql` não foi rodado (ou foi rodado depois da conta ser criada). Rode-o e crie a conta de novo, ou rode: `insert into public.profiles (id, display_name) select id, split_part(email,'@',1) from auth.users on conflict do nothing;` |
| “Seu e-mail ainda não foi confirmado” / link do e-mail abre localhost | Passo 4: desligue *Confirm email*, ou configure *Site URL* e *Redirect URLs* e use **Reenviar e-mail**. |
| Forja/admin dão erro ao enviar | A migração `003_admin_forge.sql` não foi rodada. |
| Aba Admin diz que a migração 004 falta | Rode `004_admin_accounts.sql` no SQL Editor. |
| Classes não aparecem no seletor | O `002_seed_classes.sql` não foi rodado. |
| Chat não atualiza sozinho | Rode de novo o final do `001_schema.sql` (seção *Tempo real*) ou confira em *Database → Publications → supabase_realtime*. |
| Abas do Mestre não aparecem | O comando SQL do passo 8 não achou o e-mail; confira se é o mesmo da conta e recarregue a página. |

---

## Próximo passo (futuro): Cloudflare R2 para imagens

O R2 guardará imagens (retratos de personagens, mapas, tokens). **Não é preciso configurar nada agora.**
O banco já tem a coluna `characters.avatar_url` reservada. Quando for a hora, o caminho é:

1. Cloudflare → **R2 Object Storage** → criar um bucket (exige cartão para ativar, mas o plano grátis de
   10 GB/mês não cobra).
2. Um *Pages Function* (pasta `web/functions/`) gera URLs assinadas de upload, validando o login do Supabase.
3. O site envia o arquivo direto ao R2 e salva a URL no banco.

Essa etapa será construída em cima do que já está pronto aqui.
