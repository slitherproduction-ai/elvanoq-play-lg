# Checkpoint 005 — catálogo e reprodução nativa

Versão do app: `0.3.0`

## Entregue

- Carregamento do catálogo autorizado para listas M3U e Xtream sincronizadas pelo Portal.
- Parser M3U básico e leitura de canais ao vivo por `player_api.php` para Xtream.
- Reprodução pelo elemento de vídeo nativo do webOS, acionada somente após nova validação da licença.
- Catálogo sem exposição de URLs, senha ou chave na interface e sem logs desses dados.
- Navegação por foco continua baseada em botões HTML e setas do controle.

## Segurança e preservações

- O catálogo exige `active`, `license.can_play` e `code_access.can_connect` quando a resposta o trouxer.
- A identidade LG mantém o hash webOS; nenhum LGUDID é enviado como texto ou convertido em MAC.
- HTTP/HTTPS e porta da lista são preservados como fornecidos pelo provedor.

## Validação local

- `node tests/playlist-sync.test.cjs`
- `node scripts/validate-webos.mjs`
- `node --check app.js`

## Homologação pendente

1. Validar M3U, Xtream e formatos HLS/TS em TV LG física.
2. Confirmar compatibilidade CORS/codec de cada provedor autorizado.
3. Validar parada, retorno e foco do controle remoto durante reprodução.

Nenhum IPK foi gerado.
