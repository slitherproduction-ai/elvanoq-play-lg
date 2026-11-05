# Lista de testes — ELVANOQ Play LG 1.1.0

Rodar numa LG webOS 4.x ou 5.x (mais lenta) e numa 2022+ (webOS 22+). No Samsung (MSX), repetir numa TV 2022+ e numa até 2021.

| # | Teste | Como fazer | Esperado | 4.x/5.x | 22+ |
|---|---|---|---|---|---|
| 1 | Travamento curto no ao vivo | Abrir um canal, tirar o cabo/Wi-Fi do roteador por 15 s e religar | "O sinal parou de chegar. Reconectando…" e o canal volta sozinho | ☐ | ☐ |
| 2 | Travamento curto em filme | Mesmo teste com um filme no meio | Reconecta e volta ao mesmo ponto (±10 s) | ☐ | ☐ |
| 3 | Travamento longo | Internet desligada por 1 min | Depois de 3 tentativas: tela de erro com "Tentar"; "Tentar" funciona com a internet de volta | ☐ | ☐ |
| 4 | Pausa não conta | Pausar um filme por 1 min | Nenhuma reconexão | ☐ | ☐ |
| 5 | Segundo plano não conta | Abrir outro app com um canal tocando e voltar | Sem tela de erro; deep link e Voltar seguem funcionando | ☐ | ☐ |
| 6 | Formato lembrado | Lista com canal só TS, "Automático": abrir, fechar e abrir de novo | 2ª abertura começa direto em TS (Diagnóstico mostra "Último formato que abriu: TS") | ☐ | ☐ |
| 7 | Formato manual | Ajustes > Formato do ao vivo = HLS | Canais abrem em HLS mesmo com TS lembrado | ☐ | ☐ |
| 8 | Rever programas | Canal com arquivo: AZUL > Rever programas > escolher | Toca o programa; testar servidores com cada um dos 3 formatos | ☐ | ☐ |
| 9 | Rever indisponível | Programa sem arquivo no servidor | "Este programa não está disponível para rever." (não abre o ao vivo) | ☐ | ☐ |
| 10 | Sem catch-up | Canal sem `tv_archive` | AZUL só favorita; a opção não aparece | ☐ | ☐ |
| 11 | Adultos automático | Lista com categoria "Adultos" | Bloqueada com selo "Automática"; pede PIN | ☐ | ☐ |
| 12 | Liberar e bloquear | Em Controle parental, OK na categoria adulta duas vezes | 1ª libera (exceção), 2ª volta a bloquear | ☐ | ☐ |
| 13 | Desligar proteção | "Proteger conteúdo adulto" = DESLIGADO | Categorias adultas liberadas (bloqueios manuais continuam) | ☐ | ☐ |
| 14 | Ocultar categoria | Ajustes > Categorias visíveis > ocultar uma de Filmes | Some da coluna, das grades, da Home e da Busca; mostrar de novo volta | ☐ | ☐ |
| 15 | Por lista | Trocar de lista | Ocultas, formato lembrado e bloqueios são da lista ativa | ☐ | ☐ |
| 16 | Diagnóstico | Ajustes > Diagnóstico > OK | Portal e servidor com tempo de resposta; nenhum endereço/usuário/senha na tela | ☐ | ☐ |
| 17 | Voltar | Em cada página de Ajustes | Volta para a central; na central volta para a Início; na Início sai | ☐ | ☐ |
| 18 | Deep links | `movie:`, `episode:`, `series:`, `channel:` | Igual à 1.0.3 | ☐ | ☐ |
| 19 | Desempenho | Navegar nos Ajustes e nas listas na webOS 4/5 | Sem travadas nas animações de foco | ☐ | ☐ |
| 20 | Pacote | Rodar o workflow `package-ipk.yml` | Passo "Check IPK contents" verde (sem `.git`, `.github`, `tests`, `scripts`, `dist`, `build`, `.md`) | ☐ | ☐ |
