# 🏠 Casa Mary

App e folha de cálculo para gerir as compras de uma casa nova (T1, 66 m², Ajuda — Lisboa).

Corre em cima de um Google Sheet, via Google Apps Script. Permite:

- **Consultar** as opções de cada item (frigorífico, sofá, colchão…), filtradas por item, estado, loja ou responsável, ordenadas por preço.
- **Adicionar** opções na loja, com foto (galeria ou câmara), que ficam guardadas no Sheet + Drive.
- **Orçamento** — alvo vs. estimado, quanto já foi gasto, e detalhe por categoria com os itens fechados.
- **Auto-preenchimento** no Sheet: ao escolher o SRC vencedor de um item, a linha preenche-se (custo, responsável, comentários) e fica verde.

## Ficheiros

| Ficheiro | O que é |
|---|---|
| `Code.gs` | Código Apps Script — automatismos do Sheet + backend da app |
| `Sidebar.html` | Interface da app (barra lateral no PC / página web no telemóvel) |
| `MANUAL.md` | Como instalar e usar, passo a passo |

## Instalação rápida

1. No Google Sheet: **Extensões → Apps Script**.
2. Cola `Code.gs` no `Código.gs`, e `Sidebar.html` num ficheiro HTML novo chamado `Sidebar`.
3. Recarrega o Sheet e corre **🏠 Casa Nova → ⚙️ Configurar tudo**.
4. Para o telemóvel: **Implementar → Nova implementação → App Web** e abre o link `/exec`.

Ver `MANUAL.md` para os detalhes (iPhone e Android).

## Estados dos itens

`Por tratar` · `Em pesquisa` · `Stand by` · `Fechado` (verde) · `Excluído` (vermelho) · `A comprar`

---

*Preços e opções recolhidos em julho/agosto 2026 — confirmar sempre antes de comprar.*
