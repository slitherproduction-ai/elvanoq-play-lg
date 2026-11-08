# Changelog — ELVANOQ Play LG webOS

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
