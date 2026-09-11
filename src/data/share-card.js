// Tarjeta de resultado compartible — a pedido de Christian (auditoría de
// producto, idea #1): genera una imagen PNG con la estética de Lux Astral
// (misma paleta que src/styles.css) para compartir una tirada de tarot o
// el estado lunar del día. Todo se dibuja en un <canvas> fuera de pantalla,
// sin librerías externas — carga plana como el resto de src/data/*.js
// (ver Arcana.html), así que estas funciones quedan disponibles como
// globales para Reading.jsx y OtherPages.jsx igual que astro-calc.js.

const SHARE_CARD_W = 1080;
const SHARE_CARD_H = 1350;
// Paleta — copiada literalmente de los tokens :root de src/styles.css.
// (un <canvas> no puede leer variables CSS, así que se duplican acá a
// propósito; si la paleta del sitio cambia, actualizar también estos).
const SHARE_CARD_COLORS = {
  bg: '#0f0a24',
  bg2: '#1a1438',
  ink: '#f0e2c0',
  inkSoft: '#b3a8c8',
  gold: '#d4a85a',
  purple: '#5a3a8a',
  rose: '#b86a8a',
};

function shareCardRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Envuelve texto centrado (asume ctx.textAlign = 'center'); devuelve el
// alto total ocupado para poder seguir dibujando debajo.
function shareCardWrapText(ctx, text, centerX, y, maxWidth, lineHeight, maxLines) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  let line = '';
  let lines = [];
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (maxLines && lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  lines.forEach((l, i) => ctx.fillText(l, centerX, y + i * lineHeight));
  return lines.length * lineHeight;
}

function shareCardLoadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen: ' + src));
    img.src = src;
  });
}

async function shareCardEnsureFonts() {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.all([
      document.fonts.load('600 46px Cinzel'),
      document.fonts.load('500 30px Cinzel'),
      document.fonts.load('400 32px "Cormorant Garamond"'),
      document.fonts.load('italic 400 32px "Cormorant Garamond"'),
    ]);
  } catch (e) {
    // si las tipografías no cargan a tiempo, el canvas cae a la fuente
    // que el navegador tenga disponible — no bloquea la generación.
  }
}

function shareCardPaintBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, SHARE_CARD_H);
  grad.addColorStop(0, '#150f30');
  grad.addColorStop(1, '#0b0718');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SHARE_CARD_W, SHARE_CARD_H);

  const glow1 = ctx.createRadialGradient(
    SHARE_CARD_W * 0.18, SHARE_CARD_H * 0.08, 0,
    SHARE_CARD_W * 0.18, SHARE_CARD_H * 0.08, SHARE_CARD_W * 0.75
  );
  glow1.addColorStop(0, 'rgba(90,58,138,0.35)');
  glow1.addColorStop(1, 'rgba(90,58,138,0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, SHARE_CARD_W, SHARE_CARD_H);

  const glow2 = ctx.createRadialGradient(
    SHARE_CARD_W * 0.85, SHARE_CARD_H * 0.92, 0,
    SHARE_CARD_W * 0.85, SHARE_CARD_H * 0.92, SHARE_CARD_W * 0.7
  );
  glow2.addColorStop(0, 'rgba(212,168,90,0.16)');
  glow2.addColorStop(1, 'rgba(212,168,90,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, SHARE_CARD_W, SHARE_CARD_H);
}

function shareCardPaintHeader(ctx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = SHARE_CARD_COLORS.gold;
  ctx.font = '600 30px Cinzel, Georgia, serif';
  ctx.fillText('L U X   A S T R A L', SHARE_CARD_W / 2, 96);
}

async function shareCardPaintFooter(ctx, logoSrc) {
  const y = SHARE_CARD_H - 70;
  let logoImg = null;
  if (logoSrc) {
    try { logoImg = await shareCardLoadImage(logoSrc); } catch (e) { logoImg = null; }
  }
  ctx.textAlign = 'center';
  if (logoImg) {
    const h = 44;
    const w = h * (logoImg.width / logoImg.height);
    ctx.drawImage(logoImg, SHARE_CARD_W / 2 - w / 2, y - h + 8, w, h);
  } else {
    ctx.fillStyle = SHARE_CARD_COLORS.ink;
    ctx.font = '600 22px Cinzel, Georgia, serif';
    ctx.fillText('LUX ASTRAL', SHARE_CARD_W / 2, y);
  }
  ctx.fillStyle = 'rgba(240,226,192,0.55)';
  ctx.font = '400 22px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('luxastral.com', SHARE_CARD_W / 2, SHARE_CARD_H - 26);
}

function shareCardDrawFramedImage(ctx, img, x, y, w, h, rotate180) {
  ctx.save();
  ctx.shadowColor = 'rgba(212,168,90,0.35)';
  ctx.shadowBlur = 50;
  shareCardRoundRect(ctx, x - 6, y - 6, w + 12, h + 12, 22);
  ctx.fillStyle = SHARE_CARD_COLORS.bg2;
  ctx.fill();
  ctx.restore();

  ctx.save();
  shareCardRoundRect(ctx, x, y, w, h, 18);
  ctx.clip();
  if (rotate180) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(Math.PI);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();

  ctx.save();
  shareCardRoundRect(ctx, x, y, w, h, 18);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(212,168,90,0.7)';
  ctx.stroke();
  ctx.restore();
}

// ---------- Tirada de tarot (una o varias cartas) ----------
// picked: [{ card: {name_es,name_en,key,...}, reversed }]
// positions: nombres de posición paralelos a picked (o null)
async function renderReadingShareCard({ picked, positions, question, dateLabel, lang, logoSrc }) {
  await shareCardEnsureFonts();
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_W;
  canvas.height = SHARE_CARD_H;
  const ctx = canvas.getContext('2d');
  shareCardPaintBackground(ctx);
  shareCardPaintHeader(ctx);

  ctx.textAlign = 'center';
  ctx.fillStyle = SHARE_CARD_COLORS.inkSoft;
  ctx.font = '400 26px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(dateLabel || '', SHARE_CARD_W / 2, 140);

  let gridTop = 180;
  if (question) {
    ctx.fillStyle = 'rgba(240,226,192,0.78)';
    ctx.font = 'italic 400 30px "Cormorant Garamond", Georgia, serif';
    const used = shareCardWrapText(ctx, `"${question}"`, SHARE_CARD_W / 2, 190, 840, 40, 2);
    gridTop = 190 + used + 20;
  }

  const images = await Promise.all(
    picked.map((p) => shareCardLoadImage(window.getCardArtUrl(p.card)).catch(() => null))
  );

  const n = picked.length;
  const cols = n <= 1 ? 1 : n <= 4 ? Math.min(n, 2) : n <= 6 ? 3 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const gap = 28;
  const areaW = SHARE_CARD_W - 140;
  const areaBottom = SHARE_CARD_H - 190;
  const areaH = areaBottom - gridTop;
  const tileW = Math.min((areaW - gap * (cols - 1)) / cols, 320);
  const tileArtH = tileW * 1.62;
  const labelH = 74;
  const tileH = tileArtH + labelH;
  const totalGridH = rows * tileH + (rows - 1) * gap;
  let startY = gridTop + Math.max(0, (areaH - totalGridH) / 2);
  const totalGridW = cols * tileW + (cols - 1) * gap;
  const startX = SHARE_CARD_W / 2 - totalGridW / 2;

  picked.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (tileW + gap);
    const y = startY + row * (tileH + gap);
    const img = images[i];
    if (img) {
      shareCardDrawFramedImage(ctx, img, x, y, tileW, tileArtH, !!p.reversed);
    } else {
      ctx.save();
      shareCardRoundRect(ctx, x, y, tileW, tileArtH, 18);
      ctx.fillStyle = SHARE_CARD_COLORS.bg2;
      ctx.fill();
      ctx.restore();
    }
    const name = lang === 'es' ? p.card.name_es : p.card.name_en;
    const posLabel = positions && positions[i];
    ctx.textAlign = 'center';
    ctx.fillStyle = SHARE_CARD_COLORS.ink;
    ctx.font = `500 ${n > 4 ? 20 : 26}px Cinzel, Georgia, serif`;
    ctx.fillText(name.toUpperCase(), x + tileW / 2, y + tileArtH + 30, tileW);
    if (posLabel) {
      ctx.fillStyle = SHARE_CARD_COLORS.gold;
      ctx.font = `400 ${n > 4 ? 15 : 18}px "Cormorant Garamond", Georgia, serif`;
      ctx.fillText(posLabel, x + tileW / 2, y + tileArtH + 54, tileW);
    }
    if (p.reversed) {
      ctx.fillStyle = SHARE_CARD_COLORS.rose;
      ctx.font = `400 ${n > 4 ? 13 : 15}px Cinzel, Georgia, serif`;
      ctx.fillText(lang === 'es' ? 'INVERTIDA' : 'REVERSED', x + tileW / 2, y + tileArtH + (posLabel ? 74 : 54), tileW);
    }
  });

  await shareCardPaintFooter(ctx, logoSrc);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
}

// ---------- Estado lunar del día ----------
// moonSvgEl: el nodo <svg class="moon-svg"> ya renderizado en la página
// (se serializa tal cual, así la imagen compartida es idéntica a lo que
// el usuario está viendo, sin duplicar la geometría del terminador).
async function renderMoonShareCard({ moonSvgEl, phaseLabel, illumPct, dateLabel, ritual, lang, logoSrc }) {
  await shareCardEnsureFonts();
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_W;
  canvas.height = SHARE_CARD_H;
  const ctx = canvas.getContext('2d');
  shareCardPaintBackground(ctx);
  shareCardPaintHeader(ctx);

  ctx.textAlign = 'center';
  ctx.fillStyle = SHARE_CARD_COLORS.inkSoft;
  ctx.font = '400 26px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(dateLabel || '', SHARE_CARD_W / 2, 140);

  let moonImg = null;
  if (moonSvgEl) {
    try {
      const xml = new XMLSerializer().serializeToString(moonSvgEl);
      const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      moonImg = await shareCardLoadImage(svgUrl);
    } catch (e) { moonImg = null; }
  }
  const moonSize = 460;
  const moonX = SHARE_CARD_W / 2 - moonSize / 2;
  const moonY = 200;
  if (moonImg) {
    ctx.save();
    ctx.shadowColor = 'rgba(212,168,90,0.4)';
    ctx.shadowBlur = 70;
    ctx.drawImage(moonImg, moonX, moonY, moonSize, moonSize);
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = SHARE_CARD_COLORS.gold;
  ctx.font = '500 40px Cinzel, Georgia, serif';
  ctx.fillText((phaseLabel || '').toUpperCase(), SHARE_CARD_W / 2, moonY + moonSize + 76);

  ctx.fillStyle = SHARE_CARD_COLORS.ink;
  ctx.font = '400 30px "Cormorant Garamond", Georgia, serif';
  const illumLine = lang === 'es' ? `${Math.round(illumPct)}% iluminada en este momento` : `${Math.round(illumPct)}% illuminated right now`;
  ctx.fillText(illumLine, SHARE_CARD_W / 2, moonY + moonSize + 118);

  if (ritual) {
    ctx.fillStyle = 'rgba(240,226,192,0.78)';
    ctx.font = 'italic 400 28px "Cormorant Garamond", Georgia, serif';
    shareCardWrapText(ctx, `"${ritual}"`, SHARE_CARD_W / 2, moonY + moonSize + 176, 780, 38, 4);
  }

  await shareCardPaintFooter(ctx, logoSrc);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
}

// ---------- Compartir o descargar el PNG resultante ----------
async function shareOrDownloadImage(blob, filename, meta) {
  meta = meta || {};
  if (!blob) return 'error';
  try {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: meta.title, text: meta.text });
      return 'shared';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
    // si el share nativo falla por otra razón, seguimos al fallback de descarga
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

// Se cuelgan de window explícitamente (mismo patrón que window.getCardArtUrl
// en TarotCard.jsx) para que Reading.jsx y OtherPages.jsx, cargados como
// scripts aparte, puedan llamarlas sin depender del scoping léxico entre
// tags <script>.
window.renderReadingShareCard = renderReadingShareCard;
window.renderMoonShareCard = renderMoonShareCard;
window.shareOrDownloadImage = shareOrDownloadImage;
