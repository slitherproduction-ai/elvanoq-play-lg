# Checkpoint 003 — sincronização de listas LG webOS

Versão do app: `0.2.0`  
Escopo: somente `elvanoq-play-lg`; nenhum IPK/APK foi gerado.

## Entregue

- Cliente da ação `webos-playlist-sync` com `device_id` SHA-256 completo e `device_key`.
- Exibição do código LG retornado pelo Portal quando disponível, chave com alternância mostrar/ocultar e rota do Portal para adicionar lista.
- Estado local de listas que atualiza apenas a entrada `portal-webos:<device_id>`, mantendo listas locais de outras origens.
- Suporte a contratos M3U e Xtream sem alterar URL, protocolo, porta ou tipo da lista.
- Aplicação literal das permissões do Portal: `active`, `license.can_play` e `code_access.can_connect`.
- Tratamento de ausência de lista, rede, chave inválida, bloqueio e HTTP 429 com `Retry-After`.
- Navegação de foco adicional por setas do controle remoto.

## Validação local

- `node tests/playlist-sync.test.cjs`
- `node scripts/validate-webos.mjs`
- `node --check app.js`

## Homologação pendente em TV LG física

1. Validar leitura do LGUDID pela API Luna e confirmar que somente o hash chega ao Portal.
2. Confirmar a resposta real da versão 33 para M3U, Xtream, licença anual/vitalícia e licença individual.
3. Validar foco, botão Back e abertura da rota do Portal com o Magic Remote/controle convencional.
4. Validar uma resposta 429 real, observando o `Retry-After`, sem testes de pagamento.
