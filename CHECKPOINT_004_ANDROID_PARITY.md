# Checkpoint 004 — paridade aplicável com Android

Versão do app: `0.2.1`  
Referência Android analisada: commits recentes da linha `2.17.16`, incluindo `75e4fd2`, `1dfe96a`, `0c5f279` e `f05f5ea`.

## Aplicado à LG webOS

- O endereço de cadastro passou a ser explícito: `elvanoqplay.app/adicionar-lista/`.
- Painéis foram ajustados para telas de TV com menor altura: conteúdo com rolagem segura, espaçamento proporcional e cartões menos extensos.
- A validação das listas do Portal aceita exclusivamente HTTP/HTTPS e preserva exatamente protocolo e porta de M3U/Xtream recebidos do servidor.
- Os testes cobrem HTTP, HTTPS, porta explícita e bloqueiam protocolos fora do contrato.

## Não portado por incompatibilidade de plataforma

- MAC, fluxo Pix, código de servidor Android, armazenamento seguro Android e PIN parental não pertencem ao contrato LG webOS.
- A LG continua usando o hash de identidade webOS e ações `webos-*`; nenhuma identidade LG é convertida em MAC.

## Validação local

- `node tests/playlist-sync.test.cjs`
- `node scripts/validate-webos.mjs`
- `node --check app.js`

Nenhum IPK foi gerado.
