# ELVANOQ Play LG webOS — Checkpoint 011

Versão: 1.0.3

## Finalidade

Preparação da release de produção para submissão à LG Content Store.

## Alterações desta release

- Atualização de versão de 1.0.2 para 1.0.3.
- Inclusão de `requiredACG` com `deviceinfo.query` no `appinfo.json`.

## Motivo da ACG

O aplicativo usa `com.webos.service.sm/deviceid/getIDs` apenas para gerar localmente o hash SHA-256 da identidade LG. O valor LGUDID em texto puro não é transmitido, exibido ou registrado.

## Validação esperada

- Manifesto webOS válido.
- Testes de listas, EPG e formato de stream aprovados.
- Verificação de sintaxe dos módulos JavaScript.
- Empacotamento IPK de produção pelo GitHub Actions.

## Homologação final

Antes da submissão no Seller Lounge, confirmar em TV LG física: ativação, vínculo pelo Portal, licença, sincronização, navegação por controle remoto, reprodução e retorno pelo botão Voltar.
