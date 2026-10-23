# ELVANOQ Play para LG webOS

Repositório independente do aplicativo Android. Ele contém exclusivamente o app webOS empacotável em `.ipk` e reutiliza somente os contratos públicos existentes do Portal ELVANOQ.

## Implementado no bootstrap 0.1.0

- Tela TV-first de ativação e foco por controle remoto.
- Consentimento explícito antes de consultar `LGUDID`.
- Uso de `LGUDID` em TV compatível; somente o hash SHA-256 é enviado ao Portal. A identidade local persistente é apenas fallback de simulador/desenvolvimento.
- Consulta de licença ao endpoint `portal-control` com ações próprias `webos-*`; o LGUDID não é tratado como MAC.
- Link para `https://elvanoqplay.app`.

## Limites desta entrega

Ainda não inclui login Xtream/M3U, sincronização de listas, catálogo ou player. A ativação webOS usa uma identidade de plataforma própria; o Portal armazena somente o hash do identificador LG e preserva o fluxo legado do Android sem alterações.

## Empacotamento posterior

Com webOS CLI instalado, na raiz deste repositório: `ares-package .`. O resultado será um arquivo `.ipk` para instalação de teste em uma TV com Developer Mode ativo.

## Ambientes

- **Desenvolvimento:** mudanças de código e validações automáticas; não produz `.ipk`.
- **Compilação:** GitHub Actions, pelo workflow manual **Package LG webOS IPK**. Ele só deve ser executado após autorização explícita para a versão, checkpoint e commit informados.

O fluxo completo está em [DEVELOPMENT_AND_RELEASE.md](DEVELOPMENT_AND_RELEASE.md).
