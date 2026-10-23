# Checkpoint 002 — identidade nativa LG webOS

## Entrega local

- O aplicativo LG deixa de derivar um endereço MAC a partir do `LGUDID`.
- O `LGUDID` permanece na TV; somente seu hash SHA-256 é enviado ao Portal.
- A TV usa as ações públicas `webos-device-register` e `webos-license-status`.
- Android e seu contrato `mac`/`device_key` não foram alterados.

## Backend de homologação

- Migração aditiva aplicada no projeto `xrrgjssvdqvtrqhxpask`:
  - tabela privada `portal_webos_devices`, com RLS ativo;
  - hash do identificador webOS, hash da chave local e vínculo ao dispositivo interno;
  - RPC de registro acessível apenas à função de servidor.
- A Edge Function `portal-control` foi publicada como versão 31 com as ações `webos-device-register` e `webos-license-status`.
- A RPC webOS foi recriada sem dependência de extensões opcionais do PostgreSQL; o catálogo REST foi recarregado.

## Validações

- `node --check app.js` passou.
- `node scripts/validate-webos.mjs` passou.
- Registro e consulta de licença com identidade sintética retornaram HTTP 200. A consulta bloqueou corretamente o acesso sem licença; o dispositivo de teste foi removido depois da validação.
- Nenhum `.ipk` foi gerado.
