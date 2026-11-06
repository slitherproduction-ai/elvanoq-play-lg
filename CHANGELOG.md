# Changelog — ELVANOQ Play LG webOS

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
