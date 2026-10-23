# ELVANOQ Play para LG webOS

Repositório independente do aplicativo Android. Ele contém exclusivamente o app webOS empacotável em `.ipk` e reutiliza somente os contratos públicos existentes do Portal ELVANOQ.

## Implementado no bootstrap 0.1.0

- Tela TV-first de ativação e foco por controle remoto.
- Consentimento explícito antes de consultar `LGUDID`.
- Uso de `LGUDID` em TV compatível; identidade local persistente apenas como fallback de simulador/desenvolvimento.
- Consulta de licença ao endpoint `portal-control` com `action: license-status`.
- Link para `https://elvanoqplay.app`.

## Limites desta entrega

Ainda não inclui login Xtream/M3U, sincronização de listas, catálogo ou player. O formato de identificação enviado ao Portal mantém os campos legados `mac` e `device_key`; antes da publicação será necessária uma migração explícita do Portal para registrar a plataforma `webos` e o LGUDID sem interpretar esse identificador como MAC físico.

## Empacotamento posterior

Com webOS CLI instalado, na raiz deste repositório: `ares-package .`. O resultado será um arquivo `.ipk` para instalação de teste em uma TV com Developer Mode ativo.
