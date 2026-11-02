# Checkpoint 010 — alinhamento com o Roku 1.0.1

Versão LG webOS **1.0.1**. Referência: `elvanoq-play-roku` commits `ddac097`, `e62cf85` e `4448986`.

## Replicado no LG

- **Arte própria, sem capas de terceiros:** novo splash (`splash.png` / `images/splash.jpg`) e novo fundo da ativação (`images/elvanoq-login-tv-backdrop.jpg`), iguais aos do Roku.
- **Teste gratuito encerrado:** aviso em tela cheia com o código da TV, "OK • Verificar agora" (consulta a licença na hora) e "Voltar • Sair do aplicativo". Sem pagamento nem link externo.
- **Textos sem link de renovação:** "Teste gratuito encerrado. Este aparelho não possui licença ativa." e, no player, "Esta TV não possui licença ativa para reprodução."
- **Deep link:** mesmo formato do Roku (`movie:<stream_id>[:ext]`, `episode:<id>[:ext]`, `series:<series_id>`, `channel:<stream_id>` ou o id de um item conhecido). Lido dos parâmetros de abertura do webOS (`contentId`/`mediaType`, ou `contentTarget` da busca/voz da LG) e do evento `webOSRelaunch`. Filme e episódio abrem direto no player retomando de onde parou; série abre os detalhes; canal toca ao vivo.
- **Liberação de memória:** `AppShell.releaseMemory()` mantém só a última categoria e solta a busca em cache. O webOS não tem aviso de memória como o Roku, então isso roda quando o app vai para segundo plano.

## Não se aplica ao LG

- Beacons de certificação, `rsg_version`, `supports_input_launch`, `InitClientCertificates`, `StandardKeyboardDialog` e e-mail pela tela da Roku (RFI) são exclusivos do Roku.
- **Modo loja (`store_edition`)**: existe no Roku mas está desligado (a publicação usa Portal + QR + licença). Não foi portado; pode ser feito se a LG Content Store exigir lista conectada só na TV.
