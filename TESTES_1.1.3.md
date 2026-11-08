# Testes manuais — LG webOS 1.1.3 (paridade com o Roku 1.1.1)

Numeração da busca (B1–B19) separada da do restante.

## Busca na TV ao Vivo — navegação
B1. Na TV ao Vivo, com o foco na primeira linha de canais, ▲ chega ao campo "Pesquisar canais" (fundo azul, borda ciano; o destaque da linha some).
B2. Na primeira linha de categorias, ▲ chega ao campo "Pesquisar categoria".
B3. No campo, ▲ de novo não faz nada (o app não tem menu de seções; Voltar leva à Início).
B4. No campo, ▼ volta para a lista da mesma coluna.
B5. No campo, ◀ / ▶ alternam entre os dois campos.
B6. No campo, AZUL (favorito/opções) não faz nada.

## Busca — teclado
B7. OK no campo abre o teclado com o título certo ("Pesquisar categoria" / "Pesquisar canais") e o texto atual já preenchido.
B8. Voltar do controle fecha o teclado sem mudar o filtro, e o foco continua no campo (sem travar).
B9. "Limpar" ou "Pesquisar" com o texto vazio removem o filtro.

## Busca — categorias
B10. Parte do nome (ex.: "esport") filtra a coluna, sem diferenciar maiúsculas.
B11. "Todas" (lista M3U) e "Favoritos" continuam no topo.
B12. Sem resultado aparece "Nenhuma categoria encontrada".
B13. Se a categoria aberta combina com a busca, ela continua aberta. Se não combina, abre a primeira encontrada.
B14. Categoria oculta em Ajustes → Categorias visíveis não aparece mesmo pesquisando o nome dela.

## Busca — canais
B15. Filtra pelo nome do canal e pelo programa atual do guia; a contagem mostra "N de M" (sem filtro: "N canais").
B16. Trocar de categoria mantém o filtro de canais (inclusive na lista Xtream, quando os canais chegam).
B17. Sem resultado: "Nenhum canal encontrado para "texto" nesta categoria."
B18. Com a prévia tocando, filtrar não para a prévia.
B19. Canal filtrado abre em tela cheia; canal anterior/próximo no player segue a lista filtrada.

## Voltar no player
1. Filme tocando, aperte OK para mostrar os controles e depois Voltar: os controles somem e o filme continua.
2. Com a tela limpa, Voltar sai do filme (o progresso fica salvo em Continuar assistindo).
3. Mesmo teste no ao vivo, em um episódio e no "Rever programas".
4. Pausado (controles na tela): Voltar fecha os controles; Voltar de novo sai.
5. Tela de erro ("Não foi possível reproduzir…", botão Tentar): Voltar sai direto.
6. Conteúdo protegido ou TV sem licença: Voltar sai direto.
7. Próximo episódio (painel de 6 s): Voltar continua cancelando o próximo episódio.

## Volta do ao vivo no canal que tocava
8. Abra um canal no meio da lista, troque com canal +/- (ou ▲/▼) algumas vezes e saia: a lista volta com o último canal selecionado, rolada até ele, e a prévia toca nele.
9. Com a busca de canais ativa, o mesmo vale para a lista filtrada.

## Retomada direto no ponto
10. Filme com progresso salvo: ao abrir, começa no ponto salvo sem mostrar o início antes, com o aviso "Retomando de onde você parou."
11. Episódio com progresso salvo: idem.
12. Retomada automática depois de travar continua voltando ao último ponto.

## Imagens
13. Grades, trilhos do Início, detalhes e episódios continuam com as capas nítidas, carregando mais rápido em listas grandes.
14. Logos de canais (que não são do TMDB) continuam aparecendo.

## Regressão
15. Ativação, deep links, retomada automática, formato do ao vivo, rever programas, controle parental e categorias visíveis continuam funcionando.
