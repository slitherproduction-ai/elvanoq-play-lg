# Checkpoint 009 — paridade com o código do Roku 0.1.88

Versão LG webOS **0.7.0**. Referência: `elvanoq-play-roku`, commit `563bc33` (v0.1.88).

## O que mudou

| Área | Roku 0.1.88 | LG 0.7.0 |
| --- | --- | --- |
| Ativação | `MainScene.xml`: 3 passos, código com borda ciano, QR, botão contornado, status pulsante, relógio | Mesmo layout; QR gerado na TV (`src/core/qrCode.js`, porta do `QrCode.brs`) com `https://elvanoqplay.app/adicionar-lista/?codigo=<código LG>`; a chave da TV aparece no cartão do código |
| Catálogo Xtream | Categorias + semente; itens por categoria sob demanda; cache LRU; busca global | `CatalogService.load/loadCategory/search`; cache LRU de 10 categorias / 12.000 itens no `AppShell`; busca percorre a lista completa sem guardar tudo em memória |
| Itens salvos | `xtreamItemFromSaved` | `PlaylistRules.xtreamItemFromSaved`; o LocalState guarda só id do stream, extensão, EPG e logo (nunca a URL com usuário/senha) |
| Home | Hub com blocos | Mesmo; Voltar retorna ao bloco de origem |
| Filmes/Séries | Painel 400×830 + grade 6×2 | Mesma geometria; "Buscar título" busca na lista inteira da seção |
| TV ao Vivo | Categorias, canais, prévia e guia | Mesma geometria; categorias sob demanda e Favoritos |
| Detalhes | Ações, temporadas e episódios | Mesma geometria; "Mais como este" nos filmes |
| Busca / Minha Lista | Campo + filtros / lista com abas | Mesma geometria |
| Ajustes | `ParentalView`: teclado 3×4, lista de bloqueios | Mesma tela. Sem PIN padrão: o primeiro acesso cria e confirma o PIN; o PIN fica salvo só como SHA-256 com sal; 5 erros bloqueiam por 5 minutos; um PIN antigo personalizado é migrado e o `0000` antigo é descartado |
| Player | OSD inferior, linha do tempo 1792×6, controles 160×56 | Mesma geometria |

## Específico do LG

- Consentimento antes de gerar a identificação (LGUDID nunca sai da TV; só o SHA-256 vai ao Portal).
- AZUL faz o papel do botão `*` do Roku; VERDE sincroniza a lista e AMARELO abre o login por código em Ajustes.
- Busca por ator não existe no LG: a função de pessoas/TMDB do Portal é exclusiva do Roku.

## Validação

- `node scripts/validate-webos.mjs` (ES5, manifest, assets e testes) — OK.
- Testes cobrem o catálogo sob demanda, a recriação de itens salvos e o QR (matriz conferida com decodificador).
- Capturas de todas as telas com Portal e servidor Xtream simulados (Chromium 1920×1080).
- Pendente: teste em TV LG real (HLS nativo, desempenho do cache e controle Magic Remote).

## 0.7.1 — ícone e splash do Roku (commit 1ff9095)

- `icon.png` (80×80) e `largeIcon.png` (130×130) refeitos a partir do novo `icon_elvanoq.png` do Roku: o ícone grande traz a marca com "ELVANOQ Play"; o pequeno só a marca (o nome fica ilegível em 80 px). Fonte em alta: `images/elvanoq-app-icon-512.png`.
- `splash.png` (webOS) = `splash_fhd.jpg` do Roku; `iconColor` e fundo da página em `#02070D` (`splash_color` do Roku).
- Splash em tela cheia também dentro do app, com tempo mínimo de 1,5 s (`splash_min_time=1500` do Roku) e saída suave; teclas são ignoradas enquanto ele aparece.
- O validador confere os tamanhos exigidos pelo webOS (80×80, 130×130, 1920×1080).
