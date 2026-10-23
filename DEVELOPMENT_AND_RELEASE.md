# Ambientes e release — ELVANOQ Play LG

## Desenvolvimento

- Repositório: `slitherproduction-ai/elvanoq-play-lg`.
- Alterações de código, interface, contratos de Portal, checkpoints e validações pertencem a esta área.
- O workflow **webOS validation** roda automaticamente em `main` e em pull requests. Ele verifica a sintaxe, o manifesto e os recursos obrigatórios, mas **não cria `.ipk`**.
- Nenhum dispositivo, segredo de TV, chave SSH ou credencial de conta LG é mantido no repositório.

## Compilação e release

- O workflow **Package LG webOS IPK** só aparece em **Actions → Run workflow**; não é executado por push.
- A execução deve acontecer somente depois de autorização explícita, com versão e checkpoint definidos.
- O workflow valida novamente o código, empacota com o webOS CLI oficial e publica o `.ipk` como artefato por 30 dias.
- A opção `debug_package` gera um pacote sem minificação apenas para diagnóstico em TV com Developer Mode; o padrão é o pacote minificado.

## Antes do primeiro IPK

1. Confirmar a versão no `appinfo.json`.
2. Confirmar que a vinculação LG foi implementada no Portal sem reutilizar o LGUDID como MAC físico.
3. Validar o fluxo em simulador ou TV LG com Developer Mode.
4. Solicitar explicitamente a execução do workflow, citando branch, commit e checkpoint.

O comando usado pelo pipeline é `ares-package`; a LG documenta o CLI oficial como `@webos-tools/cli`.
