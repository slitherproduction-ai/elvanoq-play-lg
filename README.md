# ELVANOQ Play para LG webOS

Repositório independente do aplicativo Android. Ele contém exclusivamente o app webOS empacotável em `.ipk` e reutiliza somente os contratos públicos existentes do Portal ELVANOQ.

## Versão 1.1.0 — paridade com o Android 2.17.21

Retomada automática quando o vídeo trava, formato do ao vivo lembrado por lista, rever programas (catch-up), proteção automática de conteúdo adulto, categorias visíveis e Ajustes premium. Veja [CHANGELOG.md](CHANGELOG.md) e [TESTES_1.1.0.md](TESTES_1.1.0.md).

## Versão 1.0.1 — alinhada ao Roku 1.0.1

Arte própria no splash e na ativação, aviso de teste encerrado sem link de pagamento, deep link e liberação de memória. Veja [CHECKPOINT_010_ROKU_1_0_1.md](CHECKPOINT_010_ROKU_1_0_1.md).

### Base: paridade com o código do Roku 0.1.88

Telas com a mesma geometria do código Roku 0.1.88 (commit 563bc33): ativação em 3 passos com QR code, Home hub, TV ao Vivo, Filmes/Séries, Detalhes, Busca, Minha Lista, Ajustes (controle parental) e Player. Catálogo Xtream sob demanda e PIN com hash e bloqueio por tentativas. Veja [CHECKPOINT_009_ROKU_CODE_PARITY.md](CHECKPOINT_009_ROKU_CODE_PARITY.md).

## Versão 0.5.0 — paridade com o Roku

A partir da 0.5.0 a versão LG segue **a mesma estrutura e o mesmo layout do app Roku** (`elvanoq-play-roku`): um módulo JavaScript por componente SceneGraph, nas mesmas coordenadas 1920×1080. Veja [ARCHITECTURE.md](ARCHITECTURE.md) e [CHECKPOINT_007_ROKU_PARITY.md](CHECKPOINT_007_ROKU_PARITY.md).

```
index.html            palco 1920x1080 + ordem de carregamento
css/app.css           sistema visual (tokens do app Android)
fonts/                Inter (OFL) embutida
images/               wordmark, logo e fundo de ativação (os mesmos do Roku)
src/core/             palco, teclas, armazenamento, estado local, parental, formatos, HTTP, SHA-256
src/services/         Portal, catálogo M3U/Xtream, guia e metadados
src/views/            ativação, shell, Home, TV ao Vivo, Filmes/Séries, Busca, Minha Lista, Ajustes, Detalhes, Player
tests/                testes das regras (Node)
```

## Histórico

### Implementado no bootstrap 0.1.0

- Tela TV-first de ativação e foco por controle remoto.
- Consentimento explícito antes de consultar `LGUDID`.
- Uso de `LGUDID` em TV compatível; somente o hash SHA-256 é enviado ao Portal. A identidade local persistente é apenas fallback de simulador/desenvolvimento.
- Consulta de licença ao endpoint `portal-control` com ações próprias `webos-*`; o LGUDID não é tratado como MAC.
- Link para `https://elvanoqplay.app`.

### Limites desta entrega

### Catálogo e reprodução

A versão `0.3.0` carrega o catálogo ao vivo da lista autorizada e usa o elemento de vídeo nativo do webOS para reprodução. M3U e Xtream preservam o protocolo e a porta recebidos; URLs e credenciais não são exibidas no catálogo nem registradas pelo app. Cada carregamento e reprodução revalida a licença no Portal.

### Sincronização de listas do Portal

A partir da versão 0.2.0, a TV consulta `webos-playlist-sync` usando somente o hash SHA-256 completo da identidade LG e a chave local do dispositivo. O LGUDID nunca sai da TV em texto puro e não é convertido em MAC.

- A lista do Portal é atualizada pelo identificador `portal-webos:<hash>` sem duplicar uma sincronização anterior.
- Listas locais de outras origens, favoritos e histórico não são removidos.
- M3U preserva `credentials.url`; Xtream preserva `host`, `username` e `password`, inclusive protocolo e porta fornecidos.
- O app aceita a lista somente quando as decisões retornadas pelo Portal permitem o acesso (`active`, `license.can_play` e, quando presente, `code_access.can_connect`).
- Ausência de lista nunca equivale a exclusão local. Falhas de rede e limite de requisições também preservam os dados locais.

Para os testes sem empacotar o app:

```sh
node tests/playlist-sync.test.cjs
node tests/epg-and-stream.test.cjs
node scripts/validate-webos.mjs   # também roda os testes
```

## Empacotamento posterior

Com webOS CLI instalado, na raiz deste repositório: `ares-package .`. O resultado será um arquivo `.ipk` para instalação de teste em uma TV com Developer Mode ativo.

## Ambientes

- **Desenvolvimento:** mudanças de código e validações automáticas; não produz `.ipk`.
- **Compilação:** GitHub Actions, pelo workflow manual **Package LG webOS IPK**. Ele só deve ser executado após autorização explícita para a versão, checkpoint e commit informados.

O fluxo completo está em [DEVELOPMENT_AND_RELEASE.md](DEVELOPMENT_AND_RELEASE.md).
