/* ───── Helpers ───── */
const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;
const rn  = (v,n=4) => Math.round(v * 10**n) / 10**n;
const g   = id => parseFloat(document.getElementById(id).value) || 0;
const safe= v  => Math.sqrt(Math.max(0, v));
const OK  = ok => ok
  ? '<span class="ok-badge">✔ OK</span>'
  : '<span class="fail-badge">✖ NO CUMPLE</span>';

/* ───── Accordion ───── */
function toggleAcc(id) {
  const el  = document.getElementById(id);
  const hdr = el.querySelector('.accordion-header');
  const bdy = el.querySelector('.accordion-body');
  hdr.classList.toggle('open');
  bdy.classList.toggle('open');
}

/* ───── Tabs ───── */
function showTab(evt, tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  evt.target.classList.add('active');
}

/* ───── Table helper ───── */
function buildTbl(id, rows) {
  document.getElementById(id).innerHTML = rows.map(([lbl, val, cls]) =>
    `<tr class="${cls||''}"><td>${lbl}</td><td>${val}</td></tr>`
  ).join('');
}

/* ═══════════════════════════════════════════
   MAIN CALCULATION
   ═══════════════════════════════════════════ */
function calcular() {
  const btn = document.getElementById('calcBtn');
  btn.classList.add('loading'); btn.disabled = true;
  setTimeout(() => {
    try { _calc(); } catch(e) { alert('Error: ' + e.message); console.error(e); }
    btn.classList.remove('loading'); btn.disabled = false;
  }, 300);
}

function _calc() {
  /* ─── Inputs ─── */
  const fc        = g('fc');        const fy     = g('fy');
  const q_adm_ton = g('q_adm_ton');
  const V         = g('V');         const h      = g('h');
  const a         = g('a');         const hs     = g('hs');
  const ep        = g('ep');        const et     = g('et');
  const ef        = g('ef');        const di     = g('di');
  const gc        = g('gc');        const ga     = g('ga');
  const b_z       = g('b_z');       const h_z    = g('h_z');
  const r_pob     = g('r') / 100;
  const P0        = g('P0');        const anio   = g('anio_base');
  const dot       = g('dot');       const Kd     = g('Kd');  const Kh = g('Kh');
  const ds        = g('ds');        const phis   = g('phis'); const hent = g('hent');
  const pp_losa   = g('pp_losa');   const sc_losa= g('sc_losa');
  const acab      = g('acab');      const otros  = g('otros');
  const WL        = g('WL');        const Lv     = g('Lv'); const Wvgt = g('Wvgt');

  /* ─── 1. DEMANDA ─── */
  const Qp  = P0 * dot / (24 * 3600);
  const Qmd = Kd * Qp;
  const Qmh = Kh * Qp;

  const popRows = [];
  for (let tt = 0; tt <= 20; tt++) {
    popRows.push([tt, anio + tt, Math.round(P0 * (1 + r_pob) ** tt)]);
  }

  /* ─── 2. GEOMETRÍA ─── */
  const H    = h + a + hs;
  const HT   = H + et;
  const di_c = Math.sqrt(4 * V / (Math.PI * h));
  const f    = di / 6;
  const de   = di + 2 * ep;
  const dc   = di + ep;
  const ep1  = 7 + 2 * h;
  const ep2  = h * 100 / 12;
  const ep3  = (1000 * h * di / 2) / (fc * 0.10 * 100);

  /* ─── 3. CÚPULA ─── */
  const Rc   = (f * f + (di / 2) ** 2) / (2 * f);
  const ad   = deg(2 * Math.atan((di / 2) / (Rc - f)));
  const ptot = pp_losa + sc_losa + acab + otros;
  const Ac   = 2 * Math.PI * Rc * f;
  const Pc   = ptot * Ac;
  const Lc   = Math.PI * di;
  const Ft   = Pc / (2 * Math.PI * Math.tan(rad(ad)));
  const Fc_c = Math.sqrt(Ft ** 2 + Pc ** 2);
  const Pml  = Fc_c / Lc;
  const Vml  = Pc / Lc;
  const et1  = Pml / (0.45 * fc * 100);
  const et2  = Vml / (0.5 * Math.sqrt(fc) * 100);

  /* ─── 4. METRADO ─── */
  const Wt   = Math.PI * dc * f * et * gc;
  const Wvp  = Math.PI * dc * 0.35 * 0.35 * gc;
  const Wm   = Math.PI * dc * ep * H * gc;
  const Wz   = Math.PI * dc * b_z * h_z * gc;
  const Wlf  = Math.PI * di * di * ef * gc / 4;
  const Wa   = Math.PI * di * di * h * ga / 4;
  const Wtot = Wt + Wvp + Wm + Wz + Wlf + Wa;

  /* ─── 5. DISEÑO VACÍO ─── */
  const Ka   = Math.tan(rad(45 + phis / 2)) ** 2;
  const qt   = ds * hent / Ka;
  const qtu  = 1.55 * qt;
  const ri   = di / 2;

  /* ─── 6. ACERO HORIZONTAL (vacío) ─── */
  const phi  = 0.9; const pmin = 0.002; const bv = 100; const dp = 26.0;
  const MuH  = 0.7361; // Ton-m
  const ab   = dp - safe(dp ** 2 - 2 * MuH * 100000 / (0.85 * fc * bv * phi));
  const AsH  = 0.85 * fc * bv * ab / (phi * fy);
  const Asm  = pmin * bv * dp;
  const AsHd = Math.max(AsH, Asm);

  /* ─── 7. ACERO VERTICAL (volteo) ─── */
  const Pv   = qtu * h / 2;
  const Mv   = Pv * h / 3;
  const Mvu  = 1.6 * Mv;
  const av   = dp - safe(dp ** 2 - 2 * Mvu * 100000 / (0.85 * fc * bv * phi));
  const Asv  = 0.85 * fc * bv * av / (phi * fy);
  const Asvd = Math.max(Asv, Asm);

  /* ─── 8. DISEÑO LLENO ─── */
  const Pag   = ga * H * H / 2;
  const Ma    = Pag * H / 3;
  const Mull  = Ma * 1.55;
  const all_  = dp - safe(dp ** 2 - 2 * Mull * 100000 / (0.85 * fc * bv * phi));
  const Asll  = 0.85 * fc * bv * all_ / (phi * fy);
  const Aslld = Math.max(Asll, Asm);
  const Vcp   = 0.85 * 0.5 * Math.sqrt(fc) * bv * dp / 1000;
  const Tfdo  = ga * H * di / 2;
  const Mo_losa = 5.079; // Ton-m – valor crítico del diagrama (constante)
  const Mauf  = 1.55 * Mo_losa;
  const dls   = 21.0;
  const alf   = dls - safe(dls ** 2 - 2 * Mauf * 100000 / (0.85 * fc * bv * phi));
  const Aslf  = 0.85 * fc * bv * alf / (phi * fy);
  const Aslfd = Math.max(Aslf, pmin * bv * dls);

  /* ─── 9. ANILLOS HORIZONTALES (lleno) ─── */
  const Fsa   = 0.5 * fy;
  const hian  = h / 5;
  const Asma  = pmin * (hian * 100) * (ep * 100);
  const alturas = [1.08, 1.80, 2.52, 3.24];
  const anRows = alturas.map((hc, i) => {
    const Ta  = 1000 * hc * hian * di / 2;
    const AsT = Ta / Fsa;
    return [i + 1, hc, rn(Ta, 2), rn(AsT), rn(Math.max(AsT, Asma))];
  });

  /* ─── 10. ZAPATA CORRIDA ─── */
  const Lc2   = Math.PI * dc;
  const Wlin  = (Wt + Wvp + Wm + Wz) / Lc2;
  const bzad  = 1.0; const hzad = 0.40;
  const sgn   = Wlin / bzad;
  const sgnd  = 2.0 * sgn;
  const vuelo = (bzad - ep) / 2;
  const dzcm  = (hzad - 0.075 - 0.00635) * 100;
  const Mz    = sgnd * vuelo ** 2 / 2;
  const az    = dzcm - safe(dzcm ** 2 - 2 * Mz * 100000 / (0.85 * fc * bv * phi));
  const Asz   = 0.85 * fc * bv * az / (phi * fy);
  const Aszd  = Math.max(Asz, pmin * bv * dzcm);

  /* ─── 11. VIGA PERIMETRAL ─── */
  const Ftvg    = Pc / (2 * Math.PI * Math.tan(rad(ad)));
  const AsvgT   = Ftvg / (0.5 * fy);
  const MT      = WL * Lv * (Lv / 2) / 2 - 0.4116 * 0.20;
  const MF      = Wvgt * Lv ** 2 / 8;
  const Asvgtot = pmin * 35 * 31.365 + AsvgT;

  /* ─── 12. DISEÑO CÚPULA ─── */
  const Ptc    = Pc / Math.sin(rad(ad));
  const eexc   = et * Math.cos(rad(ad / 2));
  const Mexc   = (Ptc / Lc) / 1000 * eexc;
  const NT     = (ptot / 10000) * Rc;
  const Atc    = NT * 1000 / (0.5 * fy);
  const dcup   = 4.5;
  const Afm    = 0.002 * 100 * dcup;
  const Asmxc  = 30 * et * 100 * fc / fy;
  const acup   = dcup - safe(dcup ** 2 - 2 * Mexc * 100000 / (0.85 * fc * 100 * 0.9));
  const Ascupd = Math.max(0.85 * fc * 100 * acup / (0.9 * fy), Afm);

  /* ═══════ RENDER ═══════ */

  /* Stats bar */
  document.getElementById('stats-bar').innerHTML = [
    ['Volumen',      V + ' m³'],
    ['Diámetro int.', di + ' m'],
    ['Altura muro H', rn(H,2) + ' m'],
    ['Peso Total',   rn(Wtot,2) + ' Ton'],
    ['Qp Promedio',  rn(Qp) + ' lps'],
    ['As pared H',   rn(AsHd,2) + ' cm²'],
  ].map(([lbl, val]) => {
    const parts = val.split(' ');
    return `<div class="stat-card">
      <div class="stat-label">${lbl}</div>
      <div class="stat-value">${parts[0]}</div>
      <div class="stat-unit">${parts.slice(1).join(' ')}</div>
    </div>`;
  }).join('');

  /* Tab Demanda */
  buildTbl('tbl-caudales', [
    ['Caudal Promedio Qp',        rn(Qp) + ' lps'],
    ['Caudal Máximo Diario Qmd',  rn(Qmd) + ' lps'],
    ['Caudal Máximo Horario Qmh', rn(Qmh) + ' lps'],
  ]);
  document.querySelector('#tbl-pob tbody').innerHTML = popRows.map(([tt,yr,pt]) =>
    `<tr><td>${tt}</td><td>${yr}</td><td>${pt.toLocaleString('es-PE')}</td></tr>`
  ).join('');

  /* Tab Geometría */
  buildTbl('tbl-predim', [
    ['H = h + a + hs',            rn(H) + ' m'],
    ['HT = H + et',               rn(HT) + ' m'],
    ['di calculado',              rn(di_c) + ' m'],
    ['di adoptado',               di + ' m', 'highlight-row'],
    ['f = di/6 (flecha cúpula)',  rn(f) + ' m'],
    ['de = di + 2·ep',            rn(de) + ' m'],
    ['dc = di + ep',              rn(dc) + ' m'],
    ['Criterio 1 empírico ep ≥',  rn(ep1,2) + ' cm'],
    ['Criterio 2 normativo ep ≥', rn(ep2,1) + ' cm'],
    ['Criterio 3 tracción ep ≥',  rn(ep3) + ' cm'],
    ['ep adoptado',               (ep*100) + ' cm', 'highlight-row'],
  ]);
  buildTbl('tbl-cup-geo', [
    ['Radio curvatura R',         rn(Rc) + ' m'],
    ['Ángulo alfa α',             rn(ad) + ' °'],
    ['α/2',                       rn(ad/2) + ' °'],
    ['Carga total ptot',          ptot + ' Kg/m²'],
    ['Área casquete Ac',          rn(Ac) + ' m²'],
    ['Peso total cúpula Pc',      rn(Pc) + ' Kg'],
    ['Ft tracción',               rn(Ft) + ' Kg'],
    ['Fc compresión',             rn(Fc_c) + ' Kg'],
    ['Lc longitud circunferencia',rn(Lc) + ' m'],
    ['P/ml',                      rn(Pml) + ' Kg/ml'],
    ['V/ml',                      rn(Vml) + ' Kg/ml'],
    ['et por compresión',         rn(et1) + ' m'],
    ['et por cortante',           rn(et2) + ' m'],
    ['et adoptado',               (et*100) + ' cm', 'highlight-row'],
  ]);

  /* Tab Metrado */
  buildTbl('tbl-metrado', [
    ['Losa de techo',     rn(Wt) + ' Ton'],
    ['Viga perimetral',   rn(Wvp) + ' Ton'],
    ['Muros',             rn(Wm) + ' Ton'],
    ['Zapata corrida',    rn(Wz) + ' Ton'],
    ['Losa de fondo',     rn(Wlf) + ' Ton'],
    ['Peso del agua',     rn(Wa) + ' Ton'],
    ['PESO TOTAL',        rn(Wtot) + ' Ton', 'highlight-row'],
  ]);

  /* Tab Diseño */
  buildTbl('tbl-vacio', [
    ['Ka coeficiente empuje activo', rn(Ka)],
    ['qt presión terreno',           rn(qt) + ' Ton/m²'],
    ['qtu con factor 1.55',          rn(qtu) + ' Ton/m²'],
  ]);
  buildTbl('tbl-asH', [
    ['Mu H diseño',      MuH + ' Ton-m'],
    ['a bloque',         rn(ab) + ' cm'],
    ['As H calculado',   rn(AsH) + ' cm²'],
    ['As mínimo',        rn(Asm) + ' cm²'],
    ['As H DISEÑO',      rn(AsHd) + ' cm²', 'highlight-row'],
  ]);
  buildTbl('tbl-asV', [
    ['Pv volteo',        rn(Pv) + ' Ton'],
    ['Mv',               rn(Mv) + ' Ton-m'],
    ['Mvu = 1.6·Mv',    rn(Mvu) + ' Ton-m'],
    ['As V vacío DISEÑO',rn(Asvd) + ' cm²', 'highlight-row'],
  ]);
  buildTbl('tbl-lleno', [
    ['P agua triangular',   rn(Pag) + ' Ton'],
    ['Ma empotramiento',    rn(Ma) + ' Ton-m'],
    ['Mu = Ma×1.55',        rn(Mull) + ' Ton-m'],
    ['As V lleno DISEÑO',   rn(Aslld) + ' cm²', 'highlight-row'],
    ['Vc cortante pared',   rn(Vcp) + ' Ton'],
    ['T tracción fondo',    rn(Tfdo) + ' Ton'],
    ['Verificación cortante', OK(Tfdo < Vcp)],
    ['d ef losa fondo',     dls + ' cm'],
    ['Mo crítico losa',     Mo_losa + ' Ton-m'],
    ['Mau = 1.55·Mo crit.', rn(Mauf) + ' Ton-m'],
    ['As losa fondo DISEÑO',rn(Aslfd) + ' cm²', 'highlight-row'],
  ]);

  /* Anillos */
  document.querySelector('#tbl-anillos tbody').innerHTML = anRows.map(
    ([i,hc,Ta,AsT,Asu]) => `<tr><td>${i}</td><td>${hc}</td><td>${Ta}</td><td>${AsT}</td><td>${Asu}</td></tr>`
  ).join('');

  buildTbl('tbl-zapata', [
    ['L circunferencia dc',   rn(Lc2) + ' m'],
    ['Peso lineal',           rn(Wlin) + ' Ton/ml'],
    ['b zapata adoptado',     bzad + ' m'],
    ['σn',                    rn(sgn) + ' Ton/m²'],
    ['Verificación σn < q_adm', OK(sgn < q_adm_ton)],
    ['σnd diseño',            rn(sgnd) + ' Ton/m²'],
    ['d ef zapata',           rn(dzcm,2) + ' cm'],
    ['Mu zapata',             rn(Mz) + ' Ton-m'],
    ['As zapata DISEÑO',      rn(Aszd) + ' cm²', 'highlight-row'],
  ]);
  buildTbl('tbl-viga', [
    ['Ft tracción viga',           rn(Ftvg) + ' Kg'],
    ['As por tracción',            rn(AsvgT) + ' cm²'],
    ['MT torsión',                 rn(MT) + ' Ton-m'],
    ['MF flexión',                 rn(MF) + ' Ton-m'],
    ['As total viga perimetral',   rn(Asvgtot) + ' cm²', 'highlight-row'],
  ]);
  buildTbl('tbl-cup-dis', [
    ['Pt resultante cúpula',       rn(Ptc) + ' Kg'],
    ['e excentricidad',            rn(eexc) + ' m'],
    ['M por excentricidad',        rn(Mexc) + ' Ton-m/m'],
    ['NT esfuerzo normal',         rn(NT) + ' Ton'],
    ['At tracción cúpula',         rn(Atc) + ' cm²'],
    ['Af mínimo',                  rn(Afm) + ' cm²'],
    ['As máx. permitido',          rn(Asmxc) + ' cm²'],
    ['As diseño cúpula',           rn(Ascupd) + ' cm²', 'highlight-row'],
    ['Verificación At+Af < As_max', OK((Atc+Afm) < Asmxc)],
  ]);

  /* Tab Resumen */
  const resumen = [
    ['Volumen diseño',            V + ' m³'],
    ['Diámetro interior di',      di + ' m'],
    ['Diámetro exterior de',      rn(de,2) + ' m'],
    ['Altura agua h',             h + ' m'],
    ['Borde libre a',             a + ' m'],
    ['Altura muro H',             rn(H,2) + ' m'],
    ['Espesor pared ep',          Math.round(ep*100) + ' cm'],
    ['Espesor losa techo et',     Math.round(et*100) + ' cm'],
    ['Espesor losa fondo ef',     Math.round(ef*100) + ' cm'],
    ['Flecha cúpula f',           rn(f,2) + ' m'],
    ['Radio cúpula R',            rn(Rc,2) + ' m'],
    ['Zapata corrida b×h',        bzad + ' × ' + hzad + ' m'],
    ["f'c concreto",              fc + ' Kg/cm²'],
    ['fy acero',                  fy + ' Kg/cm²'],
    ['As pared horizontal',       rn(AsHd,2) + ' cm²'],
    ['As pared vertical (lleno)', rn(Aslld,2) + ' cm²'],
    ['As losa de fondo',          rn(Aslfd,2) + ' cm²'],
    ['As zapata corrida',         rn(Aszd,2) + ' cm²'],
    ['As cúpula',                 rn(Ascupd,2) + ' cm²'],
  ];
  document.getElementById('summary-grid').innerHTML = resumen.map(([n,v]) =>
    `<div class="summary-item"><span class="s-label">${n}</span><span class="s-value">${v}</span></div>`
  ).join('');

  /* Show results */
  const ra = document.getElementById('results-area');
  ra.classList.add('visible');
  
  /* Draw Graphic */
  setTimeout(() => {
    drawReservoir(di, ep, h, a, hs, et, ef, f, b_z, h_z);
    ra.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 120);
}

function drawReservoir(di, ep, h, a, hs, et, ef, f, b_z, h_z) {
  const canvas = document.getElementById('reservoir-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  
  // Basic dimensions for scaling
  const vuelo = (b_z - ep) / 2;
  const max_radius = di/2 + ep + Math.max(vuelo, 0);
  const total_width = (max_radius + 2) * 2;
  const total_height = h + a + f + et + ef + h_z + 2; 
  
  // Scale and center
  const scale = Math.min(W / total_width, H / total_height);
  const cx = W / 2;
  const cy = H - 40 - (h_z + ef) * scale;
  
  // Helper to draw scaled
  const toX = x => cx + x * scale;
  const toY = y => cy - y * scale;
  
  // Colors
  const cConcrete = '#1e293b'; // slate-800
  const cWater = 'rgba(59, 130, 246, 0.3)';
  const cLine = '#94a3b8'; // slate-400
  const cDim = '#f59e0b';
  const fontDim = '12px "JetBrains Mono", monospace';
  
  ctx.lineWidth = 1.5;
  
  // 1. Draw Water
  ctx.fillStyle = cWater;
  ctx.fillRect(toX(-di/2), toY(h), di * scale, h * scale);
  
  // Water waves
  ctx.beginPath();
  ctx.moveTo(toX(-di/2), toY(h));
  for(let i=0; i<di; i+=di/10) {
    ctx.lineTo(toX(-di/2 + i + di/20), toY(h + 0.1));
    ctx.lineTo(toX(-di/2 + i + di/10), toY(h));
  }
  ctx.strokeStyle = '#60a5fa';
  ctx.stroke();

  // 2. Draw Concrete Structure
  ctx.fillStyle = cConcrete;
  ctx.strokeStyle = cLine;
  ctx.beginPath();
  
  // Left footing
  ctx.moveTo(toX(-di/2 - ep - vuelo), toY(-ef - h_z));
  ctx.lineTo(toX(-di/2 + vuelo), toY(-ef - h_z));
  ctx.lineTo(toX(-di/2 + vuelo), toY(-ef));
  
  // Bottom slab
  ctx.lineTo(toX(di/2 - vuelo), toY(-ef));
  
  // Right footing
  ctx.lineTo(toX(di/2 - vuelo), toY(-ef - h_z));
  ctx.lineTo(toX(di/2 + ep + vuelo), toY(-ef - h_z));
  ctx.lineTo(toX(di/2 + ep + vuelo), toY(-ef));
  
  // Right Wall outer
  ctx.lineTo(toX(di/2 + ep), toY(-ef));
  ctx.lineTo(toX(di/2 + ep), toY(h + a));
  
  // Dome (Outer)
  ctx.quadraticCurveTo(toX(0), toY(h + a + (f + et) * 2), toX(-di/2 - ep), toY(h + a));
  
  // Left wall outer
  ctx.lineTo(toX(-di/2 - ep), toY(h + a));
  ctx.lineTo(toX(-di/2 - ep), toY(-ef));
  ctx.lineTo(toX(-di/2 - ep - vuelo), toY(-ef));
  
  ctx.closePath();
  ctx.fill();
  
  // Inner hollow
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(toX(-di/2), toY(0));
  ctx.lineTo(toX(di/2), toY(0));
  ctx.lineTo(toX(di/2), toY(h + a));
  
  // Inner dome
  ctx.quadraticCurveTo(toX(0), toY(h + a + f * 2), toX(-di/2), toY(h + a));
  
  ctx.lineTo(toX(-di/2), toY(0));
  ctx.closePath();
  ctx.fill();
  
  ctx.globalCompositeOperation = 'source-over';
  
  // Stroke concrete
  ctx.beginPath();
  ctx.moveTo(toX(-di/2 - ep - vuelo), toY(-ef - h_z));
  ctx.lineTo(toX(-di/2 + vuelo), toY(-ef - h_z));
  ctx.lineTo(toX(-di/2 + vuelo), toY(-ef));
  ctx.lineTo(toX(di/2 - vuelo), toY(-ef));
  ctx.lineTo(toX(di/2 - vuelo), toY(-ef - h_z));
  ctx.lineTo(toX(di/2 + ep + vuelo), toY(-ef - h_z));
  ctx.lineTo(toX(di/2 + ep + vuelo), toY(-ef));
  ctx.lineTo(toX(di/2 + ep), toY(-ef));
  ctx.lineTo(toX(di/2 + ep), toY(h + a));
  ctx.quadraticCurveTo(toX(0), toY(h + a + (f + et) * 2), toX(-di/2 - ep), toY(h + a));
  ctx.lineTo(toX(-di/2 - ep), toY(-ef));
  ctx.lineTo(toX(-di/2 - ep - vuelo), toY(-ef));
  ctx.closePath();
  ctx.stroke();
  
  // Stroke inner
  ctx.beginPath();
  ctx.moveTo(toX(-di/2), toY(0));
  ctx.lineTo(toX(di/2), toY(0));
  ctx.lineTo(toX(di/2), toY(h + a));
  ctx.quadraticCurveTo(toX(0), toY(h + a + f * 2), toX(-di/2), toY(h + a));
  ctx.closePath();
  ctx.stroke();
  
  // 3. Dimensions
  ctx.fillStyle = cDim;
  ctx.strokeStyle = cDim;
  ctx.font = fontDim;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  function drawDimH(x1, x2, y, text) {
    ctx.beginPath(); ctx.moveTo(toX(x1), toY(y)); ctx.lineTo(toX(x2), toY(y)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(toX(x1), toY(y)-5); ctx.lineTo(toX(x1), toY(y)+5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(toX(x2), toY(y)-5); ctx.lineTo(toX(x2), toY(y)+5); ctx.stroke();
    ctx.fillText(text, toX((x1+x2)/2), toY(y) - 10);
  }
  
  function drawDimV(x, y1, y2, text) {
    ctx.beginPath(); ctx.moveTo(toX(x), toY(y1)); ctx.lineTo(toX(x), toY(y2)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(toX(x)-5, toY(y1)); ctx.lineTo(toX(x)+5, toY(y1)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(toX(x)-5, toY(y2)); ctx.lineTo(toX(x)+5, toY(y2)); ctx.stroke();
    ctx.save();
    ctx.translate(toX(x) - 15, toY((y1+y2)/2));
    ctx.rotate(-Math.PI/2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  
  // Interior diameter
  drawDimH(-di/2, di/2, h/2, 'di = ' + di.toFixed(2) + 'm');
  
  // Heights on the left
  const lx = -di/2 - ep - Math.max(vuelo, 0) - 0.8;
  drawDimV(lx, 0, h, 'h = ' + h.toFixed(2) + 'm');
  drawDimV(lx, h, h+a, 'a = ' + a.toFixed(2) + 'm');
  drawDimV(lx, h+a, h+a+f, 'f = ' + f.toFixed(2) + 'm');
  
  // Bottom thicknesses on right
  const rx = di/2 + ep + Math.max(vuelo, 0) + 0.8;
  drawDimV(rx, 0, -ef, 'ef = ' + ef.toFixed(2) + 'm');
  drawDimV(rx, -ef, -ef-h_z, 'hz = ' + h_z.toFixed(2) + 'm');
  
  // Wall thickness top
  drawDimH(di/2, di/2+ep, h+a+0.5, 'ep=' + ep.toFixed(2) + 'm');
  
  // Footing width
  drawDimH(-di/2-ep-vuelo, -di/2+vuelo, -ef-h_z-0.5, 'bz=' + b_z.toFixed(2) + 'm');
}
