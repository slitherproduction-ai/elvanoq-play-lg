# ELVANOQ Play LG webOS — Checkpoint 007

Versão: 0.5.0

## Objetivo

Replicar na LG a estrutura e o layout do app Roku. A versão 0.4.0 tinha todo o código em um único `app.js`; esta versão o divide em um módulo por componente do Roku, com as mesmas coordenadas FHD. Detalhes em [ARCHITECTURE.md](ARCHITECTURE.md).

## Entregue

- Ativação com o layout do `MainScene` do Roku: fundo, wordmark, cartão, código e chave da TV, e botão "Entrar com código do servidor".
- Fluxo automático registro → licença → sincronização → catálogo, com consulta periódica de licença. A expiração ou o bloqueio fecham o app e voltam à ativação.
- Home com destaque rotativo (recém-adicionado, destaque da semana, mais bem avaliado), "Continuar assistindo/Favoritos/Para você" e "Canais em destaque".
- TV ao Vivo com 3 colunas (categorias, canais com logo, prévia com áudio), guia now/next com barra de progresso e favoritos.
- Filmes e Séries em grade 6×2 com paginação; Busca com filtros Todos/Filmes/Séries/Canais.
- Minha Lista com 4 coleções: assistir mais tarde, favoritos, continuar e histórico.
- Detalhes com Assistir / Minha Lista / Assistir mais tarde / Trailer, temporadas e episódios reais do Xtream.
- Player com o OSD do Roku:
  - linha do tempo e ±10 s;
  - troca de faixa de áudio e legenda;
  - zapping ↑/↓ e guia no ao vivo;
  - reconexão 3×, pular abertura e próximo episódio em 6 s;
  - progresso salvo a cada 30 s.
- Controle parental por categoria e por item, separado por lista. PIN inicial 0000, desbloqueio válido só na sessão.
- Migração automática dos favoritos, do histórico e do PIN da v0.4.0. Para listas M3U, os ids posicionais antigos não podem ser recuperados.

## Correção

- A v0.4.0 exigia `active === true` na resposta de `webos-license-status`, mas o Portal só devolve `license`. Com isso, a reprodução era recusada mesmo com licença ativa. Agora o estado vem de `license.can_play` e `code_access`, como no Roku.

## Preservado

- Identidade LG por hash SHA-256: o LGUDID nunca sai da TV e não é tratado como MAC.
- Chaves de armazenamento da v0.4.0 (`elvanoq-lg-device-identity-v1`, `elvanoq-lg-playlists-v1`): TVs já vinculadas continuam vinculadas.
- Nenhum log de URL, credencial, senha, chave ou resposta do Portal.
- Falha de rede ou limite de requisições não apaga a lista local; o app usa a última lista sincronizada.

## Validação automatizada

- `node scripts/validate-webos.mjs`: manifesto, os 28 scripts do `index.html`, sintaxe ES5 e testes.
- `tests/playlist-sync.test.cjs` e `tests/epg-and-stream.test.cjs`: regras do Portal, M3U, Xtream, XMLTV, short EPG, formatos de stream e SHA-256.
- Navegação completa em Chromium 1920×1080 com Portal e Xtream simulados: nenhum erro de JavaScript e 3 chamadas ao Portal na abertura.

## Homologação necessária na TV física

- Reprodução `.ts`, HLS e MKV do provedor, além da troca de faixas de áudio e legendas (`audioTracks`/`textTracks` variam por modelo).
- Prévia com áudio na TV ao Vivo seguida do player em tela cheia (pipeline de vídeo único).
- Teclado virtual do webOS nos diálogos de busca e de código do servidor.
- Teclas coloridas e Magic Remote no modelo alvo.
- Resposta de `server-code-resolve` sem MAC para códigos com licença individual.
