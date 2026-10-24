# ELVANOQ Play LG webOS — Checkpoint 006

Versão: 0.4.0

## Objetivo

Transformar a experiência LG de uma tela de ativação e catálogo básico em uma base de produto alinhada à arquitetura visual e funcional do Android, preservando as diferenças obrigatórias do webOS.

## Entregue nesta etapa

- Navegação lateral para controle remoto: Início, TV ao Vivo, Filmes, Séries, Busca, Minha Lista e Ajustes.
- Home com destaque rotativo, trilhos de conteúdo e retomada local.
- Guia de TV com categorias, canais e prévia sem áudio antes da reprodução.
- Catálogos M3U e Xtream para canais, filmes e séries.
- Grade de filmes/séries, busca global e favoritos persistentes na TV.
- Tela de detalhes e episódios Xtream sob demanda.
- Player com OSD básico, retorno pelo controle e revalidação de licença antes da reprodução.
- Controle parental local por PIN, histórico e limpeza de dados locais.

## Preservado

- Identidade LG por hash SHA-256; LGUDID nunca deixa a TV em texto puro.
- Registro webOS, licença webOS e sincronização de lista pelo Portal.
- Regras de licença recebidas do servidor e preservação de listas locais.
- Nenhum log de URL, credenciais, senha, chave ou resposta do Portal.

## Homologação necessária na TV física

- Codecs/containers HLS, TS e VOD do provedor.
- Reprodução de prévia e comportamento do OSD com o controle remoto LG.
- Catálogo Xtream, carregamento de episódios, foco e desempenho em modelo webOS alvo.
- Fluxo de controle parental e recuperação após expiração do Developer Mode.
