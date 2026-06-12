# O sonho ainda está vivo? — Aposta Copa 2026

Painel premium para acompanhar o bilhete:

- Odd contratada: 75.00
- Stake inicial: R$ 10,00
- Retorno bruto potencial: R$ 750,00
- Condições originais:
  - Brasil nas semifinais
  - Argentina nas semifinais
  - Espanha nas quartas de final
  - Alemanha nas oitavas de final
  - Portugal nas oitavas de final
  - Inglaterra nas oitavas de final
  - França nas oitavas de final

## Como abrir

1. Extraia o ZIP.
2. Abra `start.bat`.
3. O painel abrirá em `http://localhost:3000`.

Requisito: Node.js instalado no Windows.

## O que foi melhorado nesta versão

- Título e conceito central alterados para **“O sonho ainda está vivo?”**.
- Visual mais premium, com cards em glassmorphism, hero mais forte e leitura mais clara.
- API unificada funcionando em `GET /api/worldcup/snapshot`.
- Proxy local para a API da Copa, evitando CORS no navegador.
- Fallback local e uso de último snapshot válido quando a API externa oscilar.
- Modelo estatístico robusto que recalcula:
  - probabilidade viva do bilhete;
  - odd justa do modelo;
  - valor justo estimado;
  - cashout justo conservador;
  - EV do modelo;
  - confiança do cálculo;
  - risco por seleção.
- Controle de stake, odd, perfil do modelo, margem de cashout e peso de correlação.
- Histórico manual para registrar odds/cashout vistos na Betano.
- Radar visual mostrando qual seleção pesa mais no risco do bilhete.

## API principal

O servidor local consulta a API gratuita/open-source do projeto WorldCup26:

```txt
GET /api/worldcup/snapshot
GET /api/worldcup/games
GET /api/worldcup/groups
GET /api/worldcup/teams
GET /api/worldcup/stadiums
```

A fonte externa padrão é:

```txt
https://worldcup26.ir/get/games
https://worldcup26.ir/get/groups
https://worldcup26.ir/get/teams
https://worldcup26.ir/get/stadiums
```

Você pode alterar a base externa usando variável de ambiente:

```txt
WORLD_CUP_BASE=https://worldcup26.ir
```

## Modelo estatístico

O modelo combina quatro blocos:

1. **Status real detectado pela API**  
   Condição cumprida vira 100%. Condição eliminada vira 0%.

2. **Ratings de força das seleções**  
   Cada seleção tem rating interno aproximado. Esse rating define a chance-base de chegar em cada fase.

3. **Forma durante a Copa**  
   Pontos, saldo de gols e resultados na fase de grupos ajustam a chance.

4. **Correlação do bilhete**  
   Várias seleções fortes precisando ir longe no mesmo torneio não são eventos totalmente independentes. O modelo aplica desconto de correlação, principalmente para Brasil e Argentina chegarem juntos às semifinais.

A odd justa é:

```txt
odd justa = 1 / probabilidade modelada
```

O valor justo estimado é:

```txt
valor justo = stake × odd contratada × probabilidade modelada
```

O cashout justo conservador é:

```txt
cashout justo = valor justo × margem configurada
```

## Betano

A Betano não disponibiliza uma API pública gratuita e estável para consultar automaticamente um bilhete específico do usuário. Por isso, o painel:

- abre seu link salvo da Betano;
- permite registrar snapshots manuais de odd/cashout;
- compara esses snapshots com a odd justa e o cashout justo calculados pelo modelo.

## Odds API opcional

Existe um campo para testar The Odds API com chave própria. Isso serve apenas para mercados gerais/futures e não substitui a conferência manual do bilhete específico na Betano.

## Observação importante

Este painel é uma ferramenta de acompanhamento e modelagem. Ele não garante resultado, não substitui conferência oficial da casa de apostas e pode depender da disponibilidade da API externa.
