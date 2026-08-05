/**********************************************************************
 * CASA MARY — Apps Script
 * Cola este ficheiro em Extensões → Apps Script (ficheiro Código.gs).
 * Adiciona também o ficheiro Sidebar.html (Ficheiro → + → HTML).
 * Depois: menu "🏠 Casa Nova" → "⚙️ Configurar tudo (correr 1x)".
 *
 * As colunas são encontradas PELO NOME do cabeçalho (linha 1),
 * por isso continua a funcionar se mudares a ordem das colunas.
 **********************************************************************/

/* ===================== CONFIGURAÇÃO ===================== */
const SHEET_LISTA    = 'Lista';
const SHEET_SOURCING = 'Sourcing';
const SHEET_RESUMO   = 'Resumo';
const FOTO_FOLDER    = 'Casa Nova — Fotos';
const ORCAMENTO_ALVO = 5000; // usado se não encontrar "Orçamento alvo" na aba Resumo

// Cores das linhas por Estado (podes trocar os códigos hex)
const COR_VERDE    = '#C6EFCE';  // Fechado
const COR_VERMELHO = '#F8CBAD';  // Excluído
const COR_AMARELO  = '#FFF2CC';  // resto (Por tratar, Em pesquisa, Stand by, A comprar)

const ESTADO_FECHADO   = 'Fechado';
const ESTADOS_VERMELHO = ['Excluído', 'Excluido'];
const ESTADOS_VALIDOS  = ['Por tratar', 'Em pesquisa', 'Stand by', 'Fechado', 'Excluído', 'A comprar'];

// Cabeçalhos na aba LISTA (têm de bater certo com a linha 1)
const L = {
  divisao:     'Divisão',
  item:        'Item',
  qtd:         'Qtd',
  precoNovo:   'Preço novo est. (€)',
  escolhido:   'Sourcing escolhido',
  valorGastar: 'Valor a gastar (€)',
  estado:      'Estado',
  custoReal:   'Custo real (€)',
  responsavel: 'Responsavel',   // sem acento, como está no teu sheet
  comentarios: 'Comentários',
};

// Cabeçalhos na aba SOURCING
const S = {
  id:          'ID',
  item:        'Item',
  loja:        'Loja / Onde',
  responsavel: 'Responsável',   // com acento, como está no teu sheet
  tipo:        'Tipo',
  link:        'Link',
  valor:       'Valor (€)',
  dim:         'Dimensões / Detalhes',
  status:      'Status',
  coment:      'Comentários',
  foto:        'Foto',          // criada automaticamente se não existir
};

/* ===================== MENU ===================== */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏠 Casa Nova')
    .addItem('🛒 Abrir app de compras', 'abrirApp')
    .addSeparator()
    .addItem('⚙️ Configurar tudo (correr 1x)', 'configurarTudo')
    .addItem('🎨 Reaplicar cores a tudo', 'recolorirTudo')
    .addItem('🔧 Corrigir fórmula "Valor a gastar"', 'corrigirFormulaValor')
    .addToUi();
}

/* ===================== UTILITÁRIOS ===================== */
function col_(sheet, headerName) {
  const hdr = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (let i = 0; i < hdr.length; i++) {
    if (String(hdr[i]).trim() === headerName) return i + 1;
  }
  return -1;
}

function letra_(n) { // 1 -> A, 27 -> AA
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

function ultimaLinha_(sheet, keyCol) {
  const vals = sheet.getRange(2, keyCol, sheet.getMaxRows() - 1, 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]).trim() !== '') return i + 2;
  return 1;
}

function num_(v) { const n = parseFloat(String(v).replace(/[^\d.,-]/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; }

/* ===================== onEdit: auto-preenchimento + cor ===================== */
function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== SHEET_LISTA) return;
  const row = e.range.getRow();
  if (row < 2) return;

  const cEsc    = col_(sh, L.escolhido);
  const cEstado = col_(sh, L.estado);
  const col = e.range.getColumn();

  if (col === cEsc) preencherDoSourcing_(sh, row);
  if (col === cEstado || col === cEsc) colorirLinha_(sh, row);
}

function preencherDoSourcing_(sh, row) {
  const ss  = sh.getParent();
  const src = ss.getSheetByName(SHEET_SOURCING);

  const cEsc = col_(sh, L.escolhido);
  const srcId = String(sh.getRange(row, cEsc).getValue()).trim();
  if (!srcId) return;

  const sIdCol = col_(src, S.id);
  const ids = src.getRange(2, sIdCol, ultimaLinha_(src, sIdCol) - 1, 1).getValues();
  let sRow = -1;
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === srcId) { sRow = i + 2; break; }
  if (sRow === -1) { SpreadsheetApp.getActive().toast('SRC não encontrado: ' + srcId, 'Casa Nova', 4); return; }

  const val    = src.getRange(sRow, col_(src, S.valor)).getValue();
  const resp   = src.getRange(sRow, col_(src, S.responsavel)).getValue();
  const coment = src.getRange(sRow, col_(src, S.coment)).getValue();

  const cCusto = col_(sh, L.custoReal);
  const cResp  = col_(sh, L.responsavel);
  const cCom   = col_(sh, L.comentarios);
  const cEst   = col_(sh, L.estado);

  if (cCusto > 0 && sh.getRange(row, cCusto).getValue() === '') sh.getRange(row, cCusto).setValue(val);
  if (cResp  > 0) sh.getRange(row, cResp).setValue(resp);
  if (cCom   > 0) sh.getRange(row, cCom).setValue(coment);
  if (cEst   > 0) sh.getRange(row, cEst).setValue(ESTADO_FECHADO);

  SpreadsheetApp.getActive().toast('Preenchido a partir de ' + srcId, 'Casa Nova', 3);
}

/* ===================== CORES ===================== */
function corDoEstado_(estado) {
  const e = String(estado).trim();
  if (e === ESTADO_FECHADO) return COR_VERDE;
  if (ESTADOS_VERMELHO.indexOf(e) !== -1) return COR_VERMELHO;
  if (e === '') return null;
  return COR_AMARELO;
}

function colorirLinha_(sh, row) {
  const cEstado = col_(sh, L.estado);
  const cItem   = col_(sh, L.item);
  const item = String(sh.getRange(row, cItem).getValue()).trim();
  const nCols = sh.getLastColumn();
  if (!item) { sh.getRange(row, 1, 1, nCols).setBackground(null); return; }
  const cor = corDoEstado_(sh.getRange(row, cEstado).getValue());
  sh.getRange(row, 1, 1, nCols).setBackground(cor);
}

function recolorirTudo() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LISTA);
  const cItem = col_(sh, L.item);
  const last = ultimaLinha_(sh, cItem);
  for (let r = 2; r <= last; r++) colorirLinha_(sh, r);
  SpreadsheetApp.getActive().toast('Cores reaplicadas (' + (last - 1) + ' linhas)', 'Casa Nova', 3);
}

/* ===================== SETUP ===================== */
function configurarTudo() {
  garantirColunaFoto_();
  configurarDropdowns_();
  corrigirFormulaValor();
  recolorirTudo();
  SpreadsheetApp.getUi().alert('Casa Nova', 'Tudo configurado ✔\n\n• Dropdowns de SRC e Estado\n• Fórmula "Valor a gastar" corrigida\n• Cores aplicadas\n• Coluna "Foto" garantida no Sourcing', SpreadsheetApp.getUi().ButtonSet.OK);
}

function garantirColunaFoto_() {
  const src = SpreadsheetApp.getActive().getSheetByName(SHEET_SOURCING);
  if (col_(src, S.foto) === -1) {
    const c = src.getLastColumn() + 1;
    src.getRange(1, c).setValue(S.foto).setFontWeight('bold');
  }
}

function configurarDropdowns_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_LISTA);
  const src = ss.getSheetByName(SHEET_SOURCING);

  const cItem = col_(sh, L.item);
  const last = ultimaLinha_(sh, cItem);

  const cEsc = col_(sh, L.escolhido);
  const sIdCol = col_(src, S.id);
  const idRange = src.getRange(2, sIdCol, Math.max(1, src.getMaxRows() - 1), 1);
  const regraSrc = SpreadsheetApp.newDataValidation().requireValueInRange(idRange, true).setAllowInvalid(true).build();
  sh.getRange(2, cEsc, last - 1, 1).setDataValidation(regraSrc);

  const cEst = col_(sh, L.estado);
  const regraEst = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS_VALIDOS, true).setAllowInvalid(true).build();
  sh.getRange(2, cEst, last - 1, 1).setDataValidation(regraEst);
}

function corrigirFormulaValor() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_LISTA);
  const src = ss.getSheetByName(SHEET_SOURCING);

  const cItem = col_(sh, L.item);
  const last = ultimaLinha_(sh, cItem);

  const escL   = letra_(col_(sh, L.escolhido));
  const qtdL   = letra_(col_(sh, L.qtd));
  const precoL = letra_(col_(sh, L.precoNovo));
  const valGCol= col_(sh, L.valorGastar);

  const sLast   = letra_(src.getLastColumn());
  const sValIdx = col_(src, S.valor);

  for (let r = 2; r <= last; r++) {
    const f = '=IFERROR(IF($' + escL + r + '<>"",VLOOKUP($' + escL + r + ',Sourcing!$A:$' + sLast + ',' + sValIdx + ',FALSE),$' + qtdL + r + '*$' + precoL + r + '),$' + qtdL + r + '*$' + precoL + r + ')';
    sh.getRange(r, valGCol).setFormula(f);
  }
}

/* ===================== APP DE COMPRAS ===================== */
function abrirApp() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('🛒 Casa Mary — Compras');
  SpreadsheetApp.getUi().showSidebar(html);
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Casa Mary — Compras')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Dados para Consultar + Adicionar
function appGetDados() {
  const ss = SpreadsheetApp.getActive();
  const src = ss.getSheetByName(SHEET_SOURCING);
  const sh = ss.getSheetByName(SHEET_LISTA);

  const sIdCol = col_(src, S.id);
  const nS = ultimaLinha_(src, sIdCol);
  const map = {};
  if (nS >= 2) {
    const vals = src.getRange(2, 1, nS - 1, src.getLastColumn()).getValues();
    const ci = {id:col_(src,S.id)-1,item:col_(src,S.item)-1,loja:col_(src,S.loja)-1,tipo:col_(src,S.tipo)-1,
                link:col_(src,S.link)-1,valor:col_(src,S.valor)-1,dim:col_(src,S.dim)-1,
                status:col_(src,S.status)-1,coment:col_(src,S.coment)-1,foto:col_(src,S.foto)-1,
                resp:col_(src,S.responsavel)-1};
    vals.forEach(v => {
      const item = String(v[ci.item]).trim(); if (!item) return;
      (map[item] = map[item] || []).push({
        id:v[ci.id], loja:v[ci.loja], tipo:v[ci.tipo], link:v[ci.link], valor:v[ci.valor],
        dim:v[ci.dim], status:v[ci.status], coment:v[ci.coment],
        resp: ci.resp>=0 ? v[ci.resp] : '',
        foto: ci.foto>=0 ? String(v[ci.foto]) : ''
      });
    });
  }

  const cItem = col_(sh, L.item), cEst = col_(sh, L.estado), cEsc = col_(sh, L.escolhido);
  const nL = ultimaLinha_(sh, cItem);
  const itens = [];
  if (nL >= 2) {
    const lv = sh.getRange(2, 1, nL - 1, sh.getLastColumn()).getValues();
    lv.forEach(v => {
      const item = String(v[cItem-1]).trim(); if (!item) return;
      itens.push({item:item, estado:String(v[cEst-1]||''), escolhido:String(v[cEsc-1]||'')});
    });
  }

  let pessoas = [], tipos = ['NOVO', 'SEGUNDA_MAO', 'Recondicionado'];
  const map2 = ss.getSheetByName('MAPPING');
  if (map2) {
    const mh = map2.getRange(1, 1, 1, map2.getLastColumn()).getValues()[0].map(x => String(x).trim());
    const iPess = mh.indexOf('Pessoas'), iEst = mh.indexOf('ESTADO');
    const mrows = map2.getRange(2, 1, Math.max(0, map2.getLastRow() - 1), map2.getLastColumn()).getValues();
    if (iPess >= 0) pessoas = mrows.map(r => String(r[iPess]).trim()).filter(String);
    if (iEst  >= 0) { const t = mrows.map(r => String(r[iEst]).trim()).filter(String); if (t.length) tipos = t; }
  }

  return {map:map, itens:itens, pessoas:pessoas, tipos:tipos};
}

// ===== ORÇAMENTO: alvo, estimado, gasto, por categoria =====
function appGetBudget() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_LISTA);

  const cDiv = col_(sh, L.divisao), cItem = col_(sh, L.item);
  const cVal = col_(sh, L.valorGastar), cReal = col_(sh, L.custoReal), cEst = col_(sh, L.estado);
  const nL = ultimaLinha_(sh, cItem);

  const cats = {}; // divisao -> {estimado, gasto, itens, fechados, lista}
  let estimado = 0, gasto = 0, nItens = 0, nFechados = 0;

  if (nL >= 2) {
    const rows = sh.getRange(2, 1, nL - 1, sh.getLastColumn()).getValues();
    rows.forEach(v => {
      const item = String(v[cItem-1]).trim(); if (!item) return;
      const div = String(v[cDiv-1]).trim() || '—';
      const est = num_(v[cVal-1]);
      const real = num_(v[cReal-1]);
      const estado = String(v[cEst-1]).trim();
      const fechado = estado === ESTADO_FECHADO;
      cats[div] = cats[div] || {estimado:0, gasto:0, itens:0, fechados:0, lista:[]};
      cats[div].estimado += est;
      cats[div].gasto += real;
      cats[div].itens += 1;
      if (fechado) cats[div].fechados += 1;
      cats[div].lista.push({item:item, estimado:est, real:real, estado:estado});
      estimado += est; gasto += real; nItens += 1; if (fechado) nFechados += 1;
    });
  }

  // Orçamento alvo: procurar na aba Resumo, senão constante
  let alvo = ORCAMENTO_ALVO;
  const res = ss.getSheetByName(SHEET_RESUMO);
  if (res) {
    const rv = res.getRange(1, 1, res.getLastRow(), Math.min(4, res.getLastColumn())).getValues();
    for (let i = 0; i < rv.length; i++) {
      for (let j = 0; j < rv[i].length; j++) {
        if (String(rv[i][j]).toLowerCase().indexOf('orçamento alvo') >= 0) {
          for (let k = j + 1; k < rv[i].length; k++) { const n = num_(rv[i][k]); if (n) { alvo = n; break; } }
        }
      }
    }
  }

  const catArr = Object.keys(cats).sort().map(k => ({
    cat:k, estimado:cats[k].estimado, gasto:cats[k].gasto, itens:cats[k].itens, fechados:cats[k].fechados, lista:cats[k].lista
  }));

  return {alvo:alvo, estimado:estimado, gasto:gasto, margem:alvo - estimado,
          nItens:nItens, nFechados:nFechados, categorias:catArr};
}

// Adiciona um novo SRC
function appAddSourcing(d) {
  const src = SpreadsheetApp.getActive().getSheetByName(SHEET_SOURCING);
  const sIdCol = col_(src, S.id);
  const last = ultimaLinha_(src, sIdCol);

  let maxN = 0;
  if (last >= 2) {
    const ids = src.getRange(2, sIdCol, last - 1, 1).getValues();
    ids.forEach(x => { const m = String(x[0]).match(/SRC-(\d+)/); if (m) maxN = Math.max(maxN, parseInt(m[1], 10)); });
  }
  const novoId = 'SRC-' + String(maxN + 1).padStart(3, '0');
  const r = last + 1;

  const set = (h, val) => { const c = col_(src, h); if (c > 0 && val != null) src.getRange(r, c).setValue(val); };
  set(S.id, novoId);
  set(S.item, d.item);
  set(S.loja, d.loja);
  set(S.responsavel, d.responsavel);
  set(S.tipo, d.tipo);
  set(S.link, d.link);
  set(S.valor, d.valor ? Number(d.valor) : '');
  set(S.dim, d.dim);
  set(S.status, d.status || 'A confirmar disponib.');
  set(S.coment, d.coment);

  let fotoUrl = '';
  if (d.fotoB64) fotoUrl = guardarFoto_(novoId, d.fotoNome, d.fotoMime, d.fotoB64, r);
  return {id: novoId, foto: fotoUrl};
}

function guardarFoto_(srcId, nome, mime, b64, sRow) {
  const pastas = DriveApp.getFoldersByName(FOTO_FOLDER);
  const pasta = pastas.hasNext() ? pastas.next() : DriveApp.createFolder(FOTO_FOLDER);
  const bytes = Utilities.base64Decode(b64);
  const blob = Utilities.newBlob(bytes, mime, srcId + '_' + (nome || 'foto'));
  const file = pasta.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const viewUrl = 'https://drive.google.com/uc?export=view&id=' + file.getId();
  const openUrl = 'https://drive.google.com/file/d/' + file.getId() + '/view';

  const src = SpreadsheetApp.getActive().getSheetByName(SHEET_SOURCING);
  const cFoto = col_(src, S.foto);
  // miniatura clicável: ao clicar abre a foto em tamanho real
  if (cFoto > 0) src.getRange(sRow, cFoto).setFormula('=HYPERLINK("' + openUrl + '",IMAGE("' + viewUrl + '",1))');
  return viewUrl;
}
