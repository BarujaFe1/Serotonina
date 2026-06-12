# O sonho ainda está vivo? — Copa 2026

Painel premium para acompanhar se a múltipla da Copa do Mundo 2026 continua viva.

## Aposta original

| Item | Valor |
|------|-------|
| Stake | R$ 10,00 |
| Odd contratada | 75.00 |
| Retorno potencial | R$ 750,00 |
| Lucro líquido | R$ 740,00 |

### Condições

1. Brasil chegar nas **semifinais**
2. Argentina chegar nas **semifinais**
3. Espanha chegar nas **quartas de final**
4. Alemanha chegar nas **oitavas de final**
5. Portugal chegar nas **oitavas de final**
6. Inglaterra chegar nas **oitavas de final**
7. França chegar nas **oitavas de final**

## Funcionalidades

- **Checklist automático**: cada seleção é avaliada com base nos dados reais da Copa 2026 (API pública worldcup26.ir)
- **Modelo estatístico**: ratings internos, forma durante a Copa, correlação entre favoritos, perfil ajustável
- **Odd justa**: calculada em tempo real com base nas probabilidades restantes
- **Cashout justo**: valor estimado com margem configurável
- **Histórico Betano**: registro manual de odds/cashout vistos na Betano para comparação com o modelo
- **Exportação**: CSV do histórico, TXT de resumo para compartilhar no WhatsApp
- **Fallback**: se a API da Copa estiver offline, usa snapshot local

## Como rodar localmente

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Como publicar no Streamlit Community Cloud

1. Acesse [https://share.streamlit.io](https://share.streamlit.io)
2. Conecte sua conta GitHub
3. Clique em **Create app**
4. Selecione o repositório: `BarujaFe1/Serotonina`
5. Branch: `main`
6. Arquivo principal: `streamlit_app.py`
7. Clique em **Deploy**

O app estará disponível em um link como: `https://serotonina.streamlit.app`

## Limitações conhecidas

- **Betano**: não existe API pública oficial gratuita para consultar um bilhete específico. O histórico é manual.
- **Modelo estatístico**: é estimativo, baseado em ratings e probabilidades teóricas. Não substitui análise profissional nem garante acerto.
- **API da Copa**: o app tenta dados reais de `worldcup26.ir`. Se a API falhar, usa fallback local com dados básicos.

## Estrutura do projeto

```
.
├── streamlit_app.py          # App principal Streamlit
├── requirements.txt          # Dependências
├── README.md
├── .gitignore
├── .streamlit/
│   └── config.toml           # Tema escuro premium
├── src/
│   ├── __init__.py
│   ├── worldcup_api.py       # API da Copa 2026 + fallback
│   ├── betting_model.py      # Modelo estatístico
│   ├── data_store.py         # Gerenciamento de estado
│   └── ui_components.py      # Componentes visuais
├── data/
│   └── fallback_snapshot.json
├── assets/
│   └── .gitkeep
└── legacy_web/               # Versão anterior (Node.js/Express)
```

## Licença

MIT
