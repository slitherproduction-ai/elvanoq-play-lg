# Arquitetura LG webOS do ELVANOQ Play

> **0.7.0:** paridade com o código do Roku 0.1.88. Catálogo Xtream sob demanda (`CatalogService.loadCategory/search` + cache LRU no `AppShell`), Ajustes = `ParentalView` do Roku (o antigo `settingsView.js` foi removido), PIN com hash e sal, QR de ativação em `src/core/qrCode.js`. Detalhes em `CHECKPOINT_009_ROKU_CODE_PARITY.md`.
>
> **0.6.0:** a navegação passou ao formato hub do Roku 0.1.88 (sem menu lateral; a Home abre as seções pelos blocos) e todas as telas usam o sistema visual do Android. Novos módulos: `src/views/settingsView.js` (Ajustes), `src/core/icons.js`, `PosterWall` em `src/views/posterGrid.js`. Detalhes em `CHECKPOINT_008_ROKU_HUB_PREMIUM.md`.

A versão LG replica a estrutura e o layout do app Roku (`elvanoq-play-roku`). Cada componente SceneGraph do Roku tem um módulo JavaScript equivalente, com **as mesmas coordenadas em 1920×1080**, as mesmas cores e os mesmos fluxos de controle remoto.

## Equivalência Roku → LG

| Roku (SceneGraph / BrightScript) | LG webOS (JavaScript ES5) |
|---|---|
| `source/main.brs` | `src/main.js` |
| `components/MainScene` (ativação) | `src/views/mainScene.js` |
| `components/AppShell` (menu + roteamento) | `src/views/appShell.js` |
| `components/HomeView` | `src/views/homeView.js` |
| `components/LiveTVView` | `src/views/liveTVView.js` |
| `components/BrowseView` (Filmes/Séries) | `src/views/browseView.js` |
| `components/SearchView` | `src/views/searchView.js` |
| `components/LibraryView` | `src/views/libraryView.js` |
| `components/ParentalView` (Ajustes) | `src/views/parentalView.js` |
| `components/DetailView` | `src/views/detailView.js` |
| `components/PlayerView` | `src/views/playerView.js` |
| `PosterGrid` / `StandardKeyboardDialog` | `src/views/posterGrid.js` / `src/views/keyboardDialog.js` |
| `components/PortalService` | `src/services/portalService.js` |
| `components/CatalogService` | `src/services/catalogService.js` + `playlistRules.js` |
| `components/EpgService` | `src/services/epgService.js` + `epgRules.js` |
| `components/MetadataService` | `src/services/metadataService.js` |
| `source/LocalState.brs` | `src/core/localState.js` |
| `source/ParentalPolicy.brs` | `src/core/parentalPolicy.js` |
| `source/StreamFormat.brs` | `src/core/streamFormat.js` |
| `roRegistrySection` | `src/core/storage.js` (localStorage / sessionStorage) |
| `Rectangle` / `Label` / `Poster` / `Timer` | `src/core/stage.js` / `src/core/ns.js` |

## Camadas

- **core**: palco 1920×1080 (escala automática), teclas do controle LG normalizadas para os nomes do Roku (`up`, `OK`, `back`, `options`…), armazenamento, estado local, política parental, formato de stream, HTTP com timeout e SHA-256.
- **services**: Portal, catálogo M3U/Xtream, guia (XMLTV ou `get_short_epg`) e metadados. `playlistRules.js` e `epgRules.js` não dependem de DOM e são testados no Node.
- **views**: uma view por componente do Roku, cada uma com `show()`, `handleKey(key)` e `setCatalog()`.

## Fluxo inicial (igual ao Roku)

1. `MainScene` exibe a ativação. Na primeira execução pede consentimento antes de consultar o LGUDID (exigência webOS).
2. O Portal recebe `webos-device-register` e `webos-license-status` com o SHA-256 da identidade e a chave numérica local.
3. Licença pendente mantém a tela de ativação com código e chave; a consulta se repete a cada 30 s (a cada 5 min quando ativa), dentro do limite de 60 chamadas/15 min do Portal.
4. Licença ativa abre o `AppShell` e chama `webos-playlist-sync`; o catálogo é carregado só em memória.
5. Expirada ou bloqueada: a reprodução é interrompida e a ativação volta a aparecer.
6. **OK na ativação** permite entrar com código do servidor → usuário → senha (`server-code-resolve`). Como no Roku, usuário e senha ficam só em memória.

## Diferenças em relação ao Roku

Diferenças obrigatórias da plataforma ou necessárias para o controle LG:

- **Botão `*` do Roku → botão AZUL** do controle LG (também VERMELHO/INFO). Os textos de ajuda mostram "AZUL".
- **Foco no menu lateral:** → ou OK entra no conteúdo; ← na borda volta ao menu. No Roku o menu reage direto a ↑/↓.
- **Magic Remote:** menu, grades, canais, botões e teclado do PIN aceitam clique do ponteiro.
- **Teclado do PIN navegável** em Ajustes, porque o Magic Remote não tem teclas numéricas.
- **Cabeçalho de Ajustes** com código, chave e licença da TV. VERDE sincroniza a lista e AMARELO abre o login por código do servidor.
- **Metadados vêm do próprio Xtream** (`get_vod_info` / `get_series_info`). O Portal não tem `webos-metadata`; o TMDB existe só para Roku. Séries trazem temporadas e episódios reais da fonte.
- **Guia ao vivo em Xtream** usa `get_short_epg` sob demanda por canal, sem baixar o XMLTV inteiro na TV.
- **Reconexão ao vivo:** a 1ª nova tentativa de um canal `.ts` usa a variante `.m3u8` (HLS nativo do webOS).

## Compatibilidade

As fontes são ES5 + Promise, sem `fetch`, `async/await`, arrow functions ou `URLSearchParams`, para rodar em TVs webOS 4+ (Chromium 53). `scripts/validate-webos.mjs` bloqueia sintaxe ES2015+.
