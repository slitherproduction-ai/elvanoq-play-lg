# ELVANOQ Play para LG webOS

Repositório independente do aplicativo Android. Ele contém exclusivamente o app webOS empacotável em `.ipk` e reutiliza somente os contratos públicos existentes do Portal ELVANOQ.

## Implementado no bootstrap 0.1.0

- Tela TV-first de ativação e foco por controle remoto.
- Consentimento explícito antes de consultar `LGUDID`.
- Uso de `LGUDID` em TV compatível; somente o hash SHA-256 é enviado ao Portal. A identidade local persistente é apenas fallback de simulador/desenvolvimento.
- Consulta de licença ao endpoint `portal-control` com ações próprias `webos-*`; o LGUDID não é tratado como MAC.
- Link para `https://elvanoqplay.app`.

## Limites desta entrega

## Sincronização de listas do Portal

A partir da versão 0.2.0, a TV consulta `webos-playlist-sync` usando somente o hash SHA-256 completo da identidade LG e a chave local do dispositivo. O LGUDID nunca sai da TV em texto puro e não é convertido em MAC.

- A lista do Portal é atualizada pelo identificador `portal-webos:<hash>` sem duplicar uma sincronização anterior.
- Listas locais de outras origens, favoritos e histórico não são removidos.
- M3U preserva `credentials.url`; Xtream preserva `host`, `username` e `password`, inclusive protocolo e porta fornecidos.
- O app aceita a lista somente quando as decisões retornadas pelo Portal permitem o acesso (`active`, `license.can_play` e, quando presente, `code_access.can_connect`).
- Ausência de lista nunca equivale a exclusão local. Falhas de rede e limite de requisições também preservam os dados locais.

Para os testes sem empacotar o app:

```sh
node tests/playlist-sync.test.cjs
node scripts/validate-webos.mjs
```

## Empacotamento posterior

Com webOS CLI instalado, na raiz deste repositório: `ares-package .`. O resultado será um arquivo `.ipk` para instalação de teste em uma TV com Developer Mode ativo.

## Ambientes

- **Desenvolvimento:** mudanças de código e validações automáticas; não produz `.ipk`.
- **Compilação:** GitHub Actions, pelo workflow manual **Package LG webOS IPK**. Ele só deve ser executado após autorização explícita para a versão, checkpoint e commit informados.

O fluxo completo está em [DEVELOPMENT_AND_RELEASE.md](DEVELOPMENT_AND_RELEASE.md).
