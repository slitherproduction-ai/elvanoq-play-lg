# 1.2.1 — 2026-11-18

- **Por que a lista não abre** (Android 2.17.77; `src/core/connectionDiagnosis.js`): sem resposta do servidor da lista, a TV consulta o nome dele no DNS público do Google (HTTPS, sem passar pelo nosso servidor e sem usuário nem senha) e diz o motivo: endereço que não existe, TV sem internet, servidor que não responde (demorou) ou provável bloqueio da operadora (falhou na hora), com a dica de trocar o DNS da TV ou do roteador. Vale ao abrir a lista (Xtream e M3U) e no Testar conexão do Diagnóstico. Novo teste `tests/connection-diagnosis.test.cjs`.
- **Interruptor Juntar qualidades** (Android 2.17.76): Ajustes › Conteúdo › Juntar qualidades, ligado por padrão. Desligado, cada canal da lista volta a ter a sua linha e o player fica sem o botão Fonte (`EP.ChannelGroups.enabled`). Linhas de Ajustes a cada 72 px para caber a nova.
- **Ao vivo engasgando ao abrir o app** (mesma correção do Samsung/LG MSX 1.2.2): a lista guardada de Novidades vale 12 h e o download da lista completa de filmes só começa depois de 20 s com a TV parada fora do player e da TV ao Vivo; com o vídeo aberto, espera. Antes ele começava junto com o primeiro canal e disputava a rede. Novo teste `tests/recent-defer.test.cjs`.
- **Qualidades do mesmo canal numa linha** (19/11; Android 2.17.75): na TV ao Vivo, canais da mesma categoria cujo nome, sem as marcas de qualidade (4K, FHD, HD, SD, H265, ALT, Backup, Opção N, ᴴᴰ…), é igual viram uma linha com o nome limpo e "N fontes" à direita (`src/core/channelGroups.js`). Coração vale para o grupo. No player, o 6º botão "Fonte" (só ao vivo com mais de uma fonte) mostra "FHD 1/3" e troca de fonte; se a fonte não abre nos dois formatos, a próxima é tentada sozinha. ▲/▼ trocam de canal, não de qualidade.
- **Erros da lista com motivo:** lista vencida (com a data), bloqueada, usuário recusado, HTTP 401/403, servidor fora do ar (5xx) e resposta que não é uma lista, cada um com o que fazer.
- **Hora do servidor no guia** (`src/core/serverClock.js`): com o relógio da TV errado, o guia e o Rever usam a hora do servidor (cabeçalho `Date` de duas respostas que concordam ou `timestamp_now` da conta; só a partir de 2 min).
- Novo teste `tests/sources-clock.test.cjs`.
- **Novidades para você igual ao Android** (`recentTitles` do Android): nas listas Xtream, a fileira passa a mostrar os filmes adicionados mais recentemente no **catálogo inteiro** (data `added` do servidor), e não mais só os primeiros 150 da categoria de lançamentos. A Início abre como antes (com a última lista de Novidades guardada desta lista, ou a semente de lançamentos na primeira vez) e, em segundo plano, lê a lista completa de filmes (o mesmo download da Busca), separa os 60 mais novos sem converter o resto e troca só a fileira, sem mexer no destaque nem no foco. Versões do mesmo título agrupadas; mostra 30. Séries só completam quando a lista tem menos de 60 filmes, na ordem do servidor (como no Android). Categorias adultas ficam de fora. Lista M3U sem mudança.
- Novo teste `tests/recent-titles.test.cjs`.

# 1.2.0 — 2026-11-14

Redesign de TV aprovado (mesmo sistema visual do Android 2.17.61–2.17.63 e da Roku 1.1.8).

- **Idioma do aplicativo: Português, English ou Automático** (canvas "Idioma do aplicativo", telas 9 e 10; mesmo do Android 2.17.72). Na ativação, botão com globo e "Português (Brasil)" ao lado do relógio (↑ a partir do botão principal); OK abre a janela de escolha com ✓ no idioma em uso e foco em pílula clara. Também em Ajustes › Sistema › Idioma (linhas a cada 80 px para caber a nova). Automático segue o idioma da TV; a escolha fica salva e o app reabre no idioma novo. `src/core/i18n.js` traduz todo texto que aparece na tela pelo dicionário `src/core/i18n-en.js` (texto exato ou modelo com partes variáveis); em português nada muda. Datas do relógio e do Rever no formato do idioma. Corrigida a posição dos atalhos da ativação depois de gerar o código (voltavam ao lugar antigo).
- **Novidades para você também na lista M3U** (inclusive a lista do Portal que volta para o M3U quando o servidor não libera a API Xtream): a fileira passa a usar os filmes e séries do grupo com nome de lançamentos (`newsItems()` no `catalogService.js`, mesma regra da semente Xtream, sem adultos). Antes, nesse caso, a fileira usava a lista toda e mostrava títulos antigos. Sem grupo de lançamentos, continua a lista toda pela data de inclusão.
- **Ativação no layout do canvas** ("Proposta visual Login e Ativação", tela 3): coluna à esquerda com título 72, passos com número ciano a cada 66 px, cartão escuro com a legenda e o código numa linha só, botão claro "Entrar com código do servidor" (760×76) e atalhos menores; QR code num cartão `#0E1524` à direita (quadro branco de 300 px) e rodapé com status e versão.
- **Imagens com reserva do TMDB** (Android 2.17.68 e Roku 1.1.8): o destaque da Início e a capa e o fundo dos Detalhes testam a imagem antes de mostrar; se o servidor de imagens do TMDB (`image.tmdb.org`) não responder, tentam o mesmo arquivo em `media.themoviedb.org` e depois a próxima imagem (sem imagem larga, a capa à direita no destaque e desfocada no fundo dos Detalhes, como antes). Só troca quando a anterior falha.
- **Ativação e Bem-vindo de volta** (canvas "Proposta visual Login e Ativação", mesmo fundo de hoje): passos com número ciano sobre `#1a2438`; código numa linha só e menor (34 px), em cartão escuro sem borda ciano (também no aviso de teste encerrado); botão e atalhos em superfície escura, com o foco em pílula clara e texto escuro. Na primeira abertura com lista salva, "Bem-vindo de volta" com o nome da lista e uma barra de 1,2 s por cima da Início, que já carrega por baixo — entra sozinho, sem apertar nada.
- **Ícones iguais em todas as versões:** Início, TV ao Vivo (TV com antena), Filmes, Séries, Minha Lista, Ajustes, busca, coração e legendas com os mesmos desenhos do canvas aprovado e do Android 2.17.66 (traço 2, viewBox 24).
- **Menu com ícones na Início:** os seis blocos dão lugar a um menu no topo, ao lado da marca — Início, TV ao Vivo, Filmes, Séries e Minha Lista em pílulas com ícone, Ajustes só com ícone e o relógio à direita. Sem atalho de Busca (continua dentro de Filmes e Séries). Aba ativa com fundo elevado `#1a2438` e ícone ciano; foco em pílula clara. Ordem vertical: menu › destaque › Novidades › Continuar; Voltar leva ao menu antes de sair. As fileiras sobem para onde ficavam os blocos. Novo ícone `home` em `src/core/icons.js`.
- **Destaque acompanha o pôster em foco:** parar 300 ms sobre um pôster de "Novidades para você" leva o título ao destaque (com os metadados sob demanda já usados); a rotação para até a lista ser recarregada.
- **Foco:** anel branco nos pôsteres (ciano fica para estado ativo). Categorias, temporadas e filtros com foco em pílula clara e selecionado com fundo elevado e ponto/marcador ciano.
- **Filmes e Séries:** a faixa do título em foco sai do rodapé e fica acima da grade; painel de categorias sem borda.
- **Player:** relógio no topo e, em filmes e episódios, "termina às HH:MM" (no lugar de "ELVANOQ PLAY"). Ao abrir filme ou episódio, a capa já baixada na tela anterior ocupa a tela com véu, título e uma linha fina animada até o primeiro quadro (campo `cover`); ao vivo, rever e trailer não usam.

# 1.1.9 — 2026-11-14

- **Novidades para você com os lançamentos de verdade:** nas listas Xtream, a semente do Início passa a ser a categoria do servidor com nome de lançamentos (ex.: "Lançamentos", "Novidades", "Recentes", "Adicionados"; categorias adultas ficam de fora). Sem uma, usa a primeira categoria não adulta. A fileira usa só essa semente e não mistura os títulos salvos (Minha Lista e Continuar assistindo). Mesmo ajuste da Roku 1.1.7 e da Samsung MSX.

# 1.1.6 — 2026-11-11

- **Lista atualizada com o app aberto** (Android 2.17.39): a TV deixa o app em segundo plano por dias. Ao voltar para o app (5 s depois), a cada 15 min e ao fechar o player, um catálogo carregado há mais de 6 h é recarregado em segundo plano, sem tela de espera e sem mexer no foco da seção aberta; as seções pegam a lista nova na próxima vez que forem abertas e as categorias já vistas são baixadas de novo. Nunca durante um vídeo. Se falhar, fica a lista atual e a próxima tentativa só depois de mais 6 h.
- **Diagnóstico > Desempenho** (Android 2.17.36, `src/core/perfMonitor.js`): tempo de abertura, tempo aberto, memória do app (`performance.memory`, quando a TV informa), pausas da tela acima de 0,4 s com a seção em que ocorreram, duração da carga do catálogo e da última categoria, e encerramentos inesperados da sessão anterior (app fechado com a tela aberta, sem sair pelo Voltar), com seção, versão e memória do último registro. OK limpa o histórico. Nada de usuário, senha ou endereço é guardado.
- No Diagnóstico, ◀/▶ escolhem entre "Testar conexão" e "Desempenho".
- Não se aplicam aqui: o download de filmes e séries por categoria (o catálogo já é sob demanda por categoria, como no Roku), a correção de foco de Filmes/Séries do Android (o foco aqui é controlado pelo app, sem esse efeito) e as otimizações nativas do APK.

# 1.1.5 — 2026-11-09

- Tela inicial com duas fileiras: Novidades para você e Continuar assistindo.

# Changelog — ELVANOQ Play LG webOS

## 1.1.8 — 13/11/2026 (abertura mais rápida, igual às versões MSX 1.1.8)

- **Da prévia para a tela cheia sem nova conexão:** com a prévia tocando o canal, OK (ou o 2º clique do Magic Remote) passa o mesmo `<video>` para o player, que só ocupa a tela inteira — a imagem continua sem recarregar, sem abrir um segundo decodificador e sem gastar uma 2ª conexão da lista. O `<video>` parado do player vira a nova prévia (`PlayerView.swapVideo`, `LiveTVView.releasePreview` / `setPreviewElement`; os eventos valem só para o vídeo em uso). A espera de 1,2 s fica só para quando a prévia está em outro canal.
- **1ª tentativa mais curta sem formato lembrado:** enquanto a TV ainda não sabe se a lista abre em TS ou HLS, o ao vivo troca de formato depois de 6 s sem imagem (antes 12 s). Com o formato lembrado, continua 12 s.
- **Pré-conexão com o servidor dos vídeos:** ao carregar a lista, a TV já resolve o endereço e abre a conexão (`dns-prefetch` + `preconnect`).
- **Diagnóstico › Desempenho › Abertura de vídeos:** do clique até a primeira imagem, por canais, filmes e episódios (último, média, pior e quantos não abriram), mais quantas vezes abriu direto da prévia.
- Testes `tests/open-speed.test.cjs` e `tests/open-timeout.test.cjs` (6 s / 12 s).

## 1.1.7 — 12/11/2026 (paridade com o Android 2.17.45 / 2.17.48 e o Roku 1.1.6)

- **Barra de tempo com foco** (filmes, episódios e rever): com a tela limpa, ◀/▶ já voltam e avançam; com os controles na tela, ▲ leva o foco para a barra (barra mais grossa e bolinha branca) e ▼ volta para os botões. Passo de 10 s com aceleração ao apertar seguido (até 0,7 s entre toques): ×3 a partir do 4º toque e ×6 a partir do 7º; trocar de direção recomeça no passo de 10 s. Os toques se acumulam num destino mostrado na barra e o salto é aplicado uma vez, 0,6 s depois do último toque (ou na hora com OK, ▼ ou ao esconder os controles). ⏪/⏩ usam a mesma aceleração. Com o Magic Remote, clicar na barra salta para aquele ponto. Ao vivo não muda.
- **Capas pelo uso e pelo aparelho:** `EP.sizedImage` aceita o papel da imagem (`poster`, `detail`, `heroPoster`, `backdrop`, `still`). Padrão: w342, w500, w780, w1280 e w300; em TVs simples (tela abaixo de Full HD ou até 1 GB informado pelo navegador): w185, w342, w500, w780 e w185. Tamanhos fixos (`'w342'`) continuam aceitos.
- **Canais que ficavam em "Carregando"** (igual à Samsung): se o canal não começa em 12 s (filmes e episódios: 30 s), a TV desiste daquela conexão e segue a reconexão normal — na 1ª tentativa troca TS ↔ HLS — e, se nada abrir, mostra o erro com "Tentar" em vez de carregar para sempre.
- Ao abrir em tela cheia um canal que estava na prévia, a TV solta a prévia antes (1,2 s): em listas com 1 conexão o servidor ainda contava a prévia e segurava o tela cheia.
- Novos testes `tests/v117-features.test.cjs` e `tests/open-timeout.test.cjs`.

## 1.1.4 — 08/11/2026 (auditoria técnica)

- **Categoria acima do limite:** quando o servidor tem mais de 5.000 títulos numa categoria, a grade mostra "5.000 de N títulos (use a busca para os demais)" em vez de cortar sem aviso.
- **Busca mais leve:** o texto bruto do catálogo usado na busca (filmes, séries e canais, dezenas de MB) sai da memória depois de 5 minutos sem buscar.
- **Grade de pôsteres (Busca e Minha Lista):** rolar uma linha mantém os pôsteres que continuam na tela e só cria os novos, sem apagar e redesenhar a grade inteira; tira o engasgo em TVs de 2016–2019.
- **Player:** se o vídeo não abrir depois das tentativas normais, tenta uma vez com usuário e senha sem codificação na URL (painéis que não aceitam `%40`, `%2B` etc., como o Android).
- **Retomada automática igual à LG/MSX e ao Samsung:** a vigilância só arma depois que o vídeo começou a andar e, após reconectar, só marca a posição na primeira leitura (o ao vivo recomeça perto de 0 e dava "O sinal não voltou" com o canal tocando). Teste `player-watchdog` incluído.

## 1.1.3 — 07/11/2026 (paridade com o Roku 1.1.1)

- **Busca na TV ao Vivo** (igual ao Android e ao Roku): campos "Pesquisar categoria" e "Pesquisar canais" no topo de cada coluna. ▲ na primeira linha chega ao campo, ▼ volta, ◀/▶ trocam de campo e OK abre o teclado (Pesquisar, Limpar, Cancelar). Categorias filtradas pelo nome (Todas e Favoritos sempre no topo; ocultas continuam ocultas). Canais filtrados pelo nome ou pelo programa atual do guia, com contagem "N de M"; o filtro continua ao trocar de categoria e a fila do player (canal anterior/próximo) usa a lista filtrada. As colunas passam a ter 13 linhas.
- **Voltar no player** (Android 2.17.29/2.17.30, Roku 1.1.1): com os controles na tela, Voltar primeiro fecha os controles; com a tela limpa, Voltar sai do player. Vale para ao vivo, filmes, séries e rever. Na tela de erro, ou quando o vídeo não chegou a carregar (conteúdo protegido, TV sem licença), Voltar sai direto.
- **Volta do ao vivo no canal que tocava:** ao sair do player, a lista de canais volta com o canal que estava tocando selecionado (inclusive depois de canal anterior/próximo), rolada até ele, e a prévia continua nele.
- **Retomada direto no ponto** (Roku 1.1.1, `PlayStart`): filme ou episódio retomado salta para o ponto salvo no `loadedmetadata`, antes de bufferizar o início (antes abria do começo e pulava no `playing`, bufferizando duas vezes). Se a TV ignorar o salto, ele é refeito no `playing`.
- **Imagens no tamanho da tela** (Roku 1.1.1): capas do TMDB pedidas em `w342` nas grades e trilhos (antes podiam vir em `original`), `w500` no pôster dos detalhes, `w300` nos episódios e `w1280` no destaque do Início e no fundo dos detalhes. Menos download, menos decodificação e menos memória. URLs que não são do TMDB passam sem mudança (`EP.sizedImage`).
- Não se aplicam à LG: a correção do ao vivo reabrindo sozinho do Roku (lá o `position` do Video só atualizava no `notificationInterval`; aqui o `currentTime` do `<video>` é contínuo) e a liberação das respostas grandes da API (o JavaScript já descarta a resposta bruta depois de montar os itens).
- Novos testes `tests/live-search.test.cjs` e `tests/v113-features.test.cjs`.

## 1.1.2 — 06/11/2026 (desempenho, do Android 2.17.25)

- Retomada automática só é armada depois que o vídeo começa a andar, com limites maiores: 20 s no ao vivo e 30 s em filmes/séries (antes 12 s e 20 s). Um servidor lento na abertura não é mais reiniciado em ciclo; depois de cada reconexão a nova fonte também tem a abertura liberada.
- Menos trabalho no player: com os controles ocultos, a linha do tempo não é redesenhada a cada `timeupdate` (~4 vezes por segundo); ela é atualizada ao abrir os controles. O progresso continua salvo a cada 30 s.
- App em segundo plano: a pausa feita pelo sistema conta como pausa do usuário, para a vigilância não reconectar sozinha na volta.
- Não se aplica à LG: o limite de buffer do ExoPlayer (o `<video>` do webOS não expõe esse controle) e a liberação da prévia, que a LG já fazia (remove o `src` e chama `load()` ao abrir o player, ao sair da TV ao Vivo e ao ir para segundo plano).

## 1.1.1 — 06/11/2026

- Tela de ativação no padrão da nova tela de login do Android 2.17.23: logo com slogan ("Sua mídia. Sua experiência."), fundo novo, relógio, "Ative sua TV" com três passos, código da TV em destaque, botão branco "Entrar com código do servidor", atalhos "Verificar ativação" (consulta a licença na hora) e "Como ativar", QR code do Portal e rodapé com status e versão. Navegação por ↑/↓/←/→ e OK.
- A chave do aparelho não aparece mais (na ativação e no topo de Ajustes): o Portal vincula a TV só pelo código.

## 1.1.0 — 04/11/2026 (paridade com o Android 2.17.21)

### Reprodução
- **Retomada automática quando o vídeo trava:** se o tempo do vídeo não avança por 12 s no ao vivo ou 20 s em filme/episódio, sem pausa do usuário e com a tela visível, a mesma fonte é recarregada. Filmes e episódios voltam à última posição depois do `loadedmetadata`. Até 3 tentativas seguidas; o contador zera quando o vídeo volta a andar. Mensagem "O sinal parou de chegar. Reconectando…" e, depois do limite, tela de erro com "Tentar". Um único `setInterval` de 4 s, limpo ao sair do player; antes de trocar a fonte o player faz `pause()`, remove o `src` e chama `load()`.
- **Formato do ao vivo lembrado por lista:** no "Automático", o formato que abriu (HLS ou TS) fica gravado em `liveFormat:<lista>` e é usado nas próximas aberturas, na prévia e no zapping. Se o primeiro formato falhar, a TV tenta o outro. A escolha manual (Ajustes > Formato do ao vivo) sempre vence.
- **Rever programas:** canais Xtream com arquivo (`tv_archive`) ganham "Rever programas" no menu do AZUL. A lista vem do `get_simple_data_table` (só programas terminados e com arquivo). Formatos tentados em ordem: `timeshift/.../{unix}/{id}.m3u8`, `timeshift/.../{AAAA-MM-DD:HH-MM}/{id}.ts` e `streaming/timeshift.php`, com o horário local da TV. Se todos falharem: "Este programa não está disponível para rever." (sem cair para o ao vivo). Canais sem arquivo não mostram a opção.
- Correção: falhas de carregamento do `<source>` agora acionam a reconexão (antes o `<video>` não recebia o evento `error`).

### Conteúdo
- **Proteção automática de conteúdo adulto:** categorias cujo nome bate com a regra do Android (adulto, xxx, +18, erótico, playboy, hentai, nsfw etc.) pedem o PIN. Opção "Proteger conteúdo adulto" no Controle parental, ligada por padrão. A categoria detectada mostra o selo "Automática"; liberar grava a exceção `!<categoria>` nos bloqueios da lista ativa e liberar de novo volta à regra. A contagem de protegidas inclui as automáticas.
- **Categorias visíveis:** nova página em Ajustes com abas Ao vivo, Filmes e Séries. As ocultas somem da coluna de categorias, de "Todos", das grades, da Home e da Busca. Gravado por lista em `hiddenCategories` (`{lista: {live|movies|series: [ids]}}`).

### Visual
- **Ajustes** virou uma central com grupos Lista / Conteúdo / Sistema e as páginas Controle parental, Categorias visíveis, Diagnóstico e Sobre no padrão premium: brilho azul no topo, rótulos de grupo em maiúsculas, cartões translúcidos com raio de 16 px, foco com borda de 2 px `#00D7FF` e botão principal branco.
- **Diagnóstico:** versão, navegador da TV, lista, categorias, memória, licença, formato do ao vivo e teste de conexão com o Portal e com o servidor (sem mostrar endereço, usuário ou senha).
- **Sobre:** versão, novidades e privacidade.
- Transições só com `transform`/`opacity` (removidas as de `box-shadow`, fundo e borda) para não travar webOS 4/5.

### Empacotamento
- O workflow `package-ipk.yml` empacota só `build/app` e falha se o IPK tiver `.git`, `.github`, `tests`, `scripts`, `dist`, `build` ou `.md`.

## 1.0.3 — 03/11/2026
- Versão enviada à LG Content Store (`requiredACG: deviceinfo.query`).

## 1.0.2 — 02/11/2026
- Link de API Xtream cadastrado como M3U vira fonte Xtream.

## 1.0.1 — 01/11/2026
- Alinhamento com o Roku 1.0.1: arte própria, aviso de teste encerrado, deep link e liberação de memória.

