# Gates of Hell

Gerenciador do sistema de RPG **Gates of Hell**: fichas, classes, inventário, bestiário, chat e rolagens
de dados em tempo real — tudo num **único site**.

| Camada | Tecnologia | Plano |
| --- | --- | --- |
| Site | React + TypeScript + Vite (`web/`) | hospedado na **Cloudflare Pages** (grátis) |
| Banco, login, tempo real | **Supabase** (Postgres + Auth + Realtime, com RLS) | grátis |
| Imagens (futuro) | **Cloudflare R2** | grátis |

> **Quer só colocar no ar?** Siga o **[guia de setup](docs/SETUP.md)** — foi escrito para quem não é programador.

## Estrutura

```
web/                     o site (Vite + React + TS)
  src/lib/dice.ts          motor de dados (sintaxe Rollem) + testes
  src/rules/index.ts       regras fixas: perícias, armaduras, armas, fórmulas de teste
  src/lib/                 auth, sincronização em tempo real, rolagens, helpers de ficha
  src/components/          chat/rolador, inventário, layout
  src/pages/               fichas, ficha, classes, bestiário, regras
supabase/migrations/     SQL: schema + RLS (001) e classes iniciais (002)
docs/SETUP.md            guia de setup passo a passo
remake-resources/        regras originais fornecidas pelo mestre (fonte da verdade)
src/, apps-script/       projeto antigo (Blazor + Google Sheets) — legado, só para referência
```

## Rodar localmente

```bash
cd web
cp .env.example .env.local   # preencha com a URL e a anon key do Supabase
npm install
npm run dev
npm test                     # motor de dados
npm run build
```

## Regras implementadas (de `remake-resources/`)

- **Teste de atributo** = `Nd20kh1` (N = atributo total, mínimo 1). **Perícia** soma o valor dela ao teste do atributo do grupo.
- **Atributo total** = valor da ficha + bônus da classe.
- **Slots de perícia** = 1 por ponto de Mental (total) + 3 da classe.
- **Vida** = Físico + valor da classe · **Postura** = Físico · **Stamina** = Espiritual + valor da classe (botão *Rolar iniciais*).
- **Resistência** = defesa da armadura (tipo + material) conforme a tabela de armaduras.
- **Armas**: dano = dado da arma + atributo (Físico ou Mental), com requisito mínimo.
- Classes e habilidades (editáveis pelo mestre) vêm de `CLASSES.md`.

## Segurança

- Login por e-mail/senha do Supabase Auth. Mestre é definido por SQL (ver guia), sem código secreto no site.
- RLS no banco: jogador só vê/edita as próprias fichas e inventário; classes, bestiário e limpar chat são do mestre;
  rolagens secretas só aparecem para o autor e o mestre.
- As rolagens são feitas no navegador e gravadas no chat — adequado para uma mesa entre amigos,
  não para competição.
