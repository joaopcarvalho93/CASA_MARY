# 🏠 Casa Mary — Manual

## Instalar (uma vez, no computador)

1. Abre o Google Sheet → **Extensões → Apps Script**.
2. No `Código.gs`: apaga tudo e cola **`Code.gs`**.
3. **+ → HTML**, nome exato **`Sidebar`** → cola **`Sidebar.html`**.
4. Guarda, recarrega o Sheet.
5. **🏠 Casa Nova → ⚙️ Configurar tudo** → aceita a autorização.

## Publicar para o telemóvel (uma vez)

1. **Implementar → Nova implementação → App Web**.
2. Executar como: **Eu** · Quem tem acesso: **Qualquer pessoa com conta Google**.
3. Copia o link que acaba em **`/exec`**.

### Pôr o ícone
- **iPhone (Safari):** Partilhar ↑ → "Adicionar ao ecrã principal".
- **Android (Chrome):** ⋮ → "Adicionar ao ecrã principal".

## Usar

- **🔎 Ver** — filtra por item, estado, loja ou responsável; opções ordenadas por preço.
- **➕ Add** — regista uma opção nova na loja, com foto (galeria ou câmara).
- **💰 Orçamento** — alvo vs. estimado, já gasto, e detalhe por categoria.
- **ℹ️ Ajuda** — resumo dentro da app.

### No Sheet
- Coluna **Sourcing escolhido** → escolhes o SRC vencedor → linha preenche-se e fica **verde**.
- Cores: Fechado 🟩 · Excluído 🟥 · resto 🟨.

## Atualizar depois de mudar o código
**Implementar → Gerir implementações → (lápis) editar → Nova versão → Implementar.**
Edita a existente para o link `/exec` não mudar.

## Problemas
| Problema | Solução |
|---|---|
| `Script function not found: doGet` | Cola o `Code.gs` novo e republica |
| Menu 🏠 não aparece | Recarrega a página do Sheet |
| Filtro "Responsável" vazio | Tens `Code.gs` antigo — cola o novo |
| Erro de permissão no telemóvel | Usa o link `/exec`, não o `/dev` |
| "Valor a gastar" errado | Corre **⚙️ Configurar tudo** |
