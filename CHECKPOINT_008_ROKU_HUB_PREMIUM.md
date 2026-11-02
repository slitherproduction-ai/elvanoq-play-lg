# ELVANOQ Play LG webOS — Checkpoint 008

Versão: 0.6.0

## Objetivo

Levar para a LG o formato hub do ELVANOQ Play Roku 0.1.88 (Home, Filmes, Séries, Detalhes e Ajustes) com o mesmo acabamento visual do app Android.

## Fontes de referência

- **Home:** captura da Home do Roku 0.1.88 enviada pelo responsável, escalada de 1280×720 para 1920×1080.
- **Roku 0.1.88:** o código dessa versão ainda não está no GitHub; `elvanoq-play-roku` está no commit `cc64a27`. Usamos a paridade registrada no app Android: `CHECKPOINT_221_HOME_ROKU_HUB.md` e `CHECKPOINT_222_TV_CATALOG_DETAILS_ROKU.md`.
- **Acabamento:** `flixplay`, arquivos `constants/brand.ts`, `constants/theme.ts`, `features/catalog/tv-catalog-browser.tsx`, `features/details/tv-details.tsx` e `app/(tabs)/settings.tsx`, além dos checkpoints 224 e 225. Medidas em dp de TV convertidas para px FHD (×2).

## Entregue

- **Navegação hub:** o menu lateral saiu. A Home abre as seções pelos blocos, e Voltar retorna à Home com o foco no bloco de origem.
- **Home:**
  - destaque de 640 px com rótulo editorial, título, metadados (categoria • ano • nota • gêneros) e sinopse;
  - botões "Assistir agora"/"Ver episódios" e "Minha Lista", paginação em 3 quadrados e relógio fixo com data;
  - 6 blocos com ícones;
  - fileira principal na ordem Continuar → Seus favoritos → Novidades para você;
  - a página sobe 328 px ao focar a fileira;
  - rotação de 8 s, pausada com foco nos botões;
  - arte larga e sinopse do destaque vêm do `get_vod_info`;
  - luz ambiente no canto superior direito.
- **Filmes e Séries:**
  - painel de categorias de 400 px com contagem, começando por Buscar título, Minha Lista e Todas;
  - a grade troca 350 ms depois que o controle para;
  - grade de 6 colunas com o rótulo da categoria;
  - rodapé com o título focado (ano • categoria • nota) e o total;
  - AZUL adiciona à Minha Lista.
- **Detalhes:**
  - arte larga ao fundo e pôster emoldurado de 360×540;
  - DETALHES • tipo, selo de nota e de qualidade, data • duração • temporadas, gêneros e sinopse em 4 linhas;
  - ações Assistir/Continuar, Minha Lista, Assistir mais tarde e Trailer;
  - séries: temporadas em abas e episódios em cartões 16:9 com progresso;
  - filmes: "Mais como este", com títulos da mesma categoria.
- **Ajustes:**
  - painel do Android TV com cartão da conta (licença, lista e versão);
  - 6 ações: atualizar lista, controle parental, dispositivo (código e chave), código do servidor, limpar histórico e sobre.
- **Controle parental:** virou uma subtela, com teclado navegável e lista de bloqueios com estado BLOQUEADO/LIBERADO.
- **TV ao Vivo:**
  - largura total, categorias com contagem (Favoritos e Todas primeiro);
  - canais com logotipo inteiro e programa atual;
  - prévia 16:9 com o selo AO VIVO e painel AGORA/A SEGUIR com progresso.
- **Busca e Minha Lista:** grades de pôsteres de 8 colunas com filtros e abas em pílula. Minha Lista mostra o progresso.
- **Player:**
  - degradês nas bordas, controles em pílula com ícones e linha do tempo arredondada;
  - logotipo do canal no ao vivo;
  - painel "Próximo episódio".
- **Ativação:** mesma composição do Roku, em cartão premium.
- **Sistema visual:**
  - fonte Inter embutida (woff, cerca de 130 KB, licença OFL);
  - paleta do Android (#070B14, #147DFF, #00D7FF…);
  - foco com borda ciano e leve ampliação;
  - ícones vetoriais próprios.

## Pendente

- Conferir Filmes, Séries e Ajustes contra o código do Roku 0.1.88 assim que ele for enviado ao GitHub.
- Homologação na TV física: desempenho de degradês e transições em modelos webOS 4/5, fontes e teclado virtual.
