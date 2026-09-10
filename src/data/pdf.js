// Generador de PDF para el historial de lecturas guardadas (sección
// Perfil) — reusa jsPDF (ya cargado en Arcana.html para el informe de
// las lecturas Tipo 5) para armar un PDF individual por lectura o un
// único PDF con todo el historial (una lectura por página).
//
// Nota: las etiquetas de posición por tirada están duplicadas a propósito
// (copia liviana de las mismas listas que usa src/pages/Reading.jsx) para
// no depender de un archivo de página desde un archivo de datos que carga
// antes en Arcana.html. Si se agrega una tirada nueva, actualizar ambos
// lugares.
const ARCANA_SPREAD_POSITIONS = {
  es: {
    daily:    ['Mensaje del día'],
    three:    ['Pasado', 'Presente', 'Futuro'],
    love:     ['Tú', 'El otro', 'Vínculo', 'Reto', 'Camino'],
    celtic:   ['Presente', 'Cruz', 'Base', 'Pasado', 'Corona', 'Futuro', 'Tú misma', 'Entorno', 'Esperanzas', 'Resultado'],
    work:     ['Situación Actual', 'Obstáculo', 'Acción a Tomar', 'Resultado Probable'],
    free:     ['Tu Pregunta', 'Consejo', 'Resultado'],
    decision: ['Situación', 'Opción A', 'Opción B', 'Lo que no ves', 'Consejo'],
    six:      ['Situación', 'Causa Raíz', 'Lo que Debes Soltar', 'Lo que Debes Abrazar', 'Acción', 'Resultado'],
    year:     ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  },
  en: {
    daily:    ["Today's message"],
    three:    ['Past', 'Present', 'Future'],
    love:     ['You', 'The other', 'Bond', 'Challenge', 'Path'],
    celtic:   ['Present', 'Cross', 'Base', 'Past', 'Crown', 'Future', 'Self', 'Environment', 'Hopes', 'Outcome'],
    work:     ['Current Situation', 'Obstacle', 'Action to Take', 'Likely Outcome'],
    free:     ['Your Question', 'Advice', 'Outcome'],
    decision: ['Situation', 'Option A', 'Option B', "What you don't see", 'Advice'],
    six:      ['Situation', 'Root Cause', 'What to Release', 'What to Embrace', 'Action', 'Outcome'],
    year:     ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
};
const ARCANA_SPREAD_NAMES = {
  es: { daily: 'Carta del día', three: 'Pasado / Presente / Futuro', love: 'Tirada del amor', celtic: 'Cruz Celta', work: 'Camino Profesional', free: 'Pregunta Libre', decision: 'Decisión', six: 'Camino de Seis Cartas', year: 'Rueda del Año' },
  en: { daily: 'Card of the day', three: 'Past / Present / Future', love: 'Love spread', celtic: 'Celtic Cross', work: 'Career Path', free: 'Open Question', decision: 'Decision', six: 'Six-Card Path', year: 'Year Ahead Wheel' },
};

window.arcanaSpreadPositions = function (spread, lang) {
  const table = ARCANA_SPREAD_POSITIONS[lang === 'es' ? 'es' : 'en'];
  return table[spread] || table.three;
};

function arcanaSpreadLabel(spread, lang) {
  const table = ARCANA_SPREAD_NAMES[lang === 'es' ? 'es' : 'en'];
  return table[spread] || spread;
}

// Dibuja una lectura guardada (del historial) en la página actual del doc.
// reading: { date, spread, question, picked:[{id,reversed}], interpretation, followUps }
function arcanaDrawReadingIntoDoc(doc, reading, lang) {
  const es = lang !== 'en';
  const marginX = 48;
  const maxWidth = 500;
  let y = 64;
  const addText = (text, size, gapAfter, bold) => {
    doc.setFontSize(size || 11);
    doc.setFont(undefined, bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(String(text || ''), maxWidth);
    lines.forEach((line) => {
      if (y > 760) { doc.addPage(); y = 64; }
      doc.text(line, marginX, y);
      y += (size || 11) * 1.35;
    });
    y += gapAfter == null ? 14 : gapAfter;
  };

  const d = reading.date ? new Date(reading.date) : new Date();
  addText('LUX ASTRAL', 18, 4, true);
  addText(arcanaSpreadLabel(reading.spread, lang) + ' — ' + d.toLocaleDateString(es ? 'es-CL' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 10, 16);
  if (reading.question) addText(`"${reading.question}"`, 11, 16);

  const positions = window.arcanaSpreadPositions(reading.spread, lang);
  const all = (window.TAROT_CARDS && window.TAROT_CARDS.all) || [];
  (reading.picked || []).forEach((p, i) => {
    const card = all.find((c) => c.id === p.id);
    if (!card) return;
    const name = es ? card.name_es : card.name_en;
    const label = positions[i] || (es ? `Carta ${i + 1}` : `Card ${i + 1}`);
    const orientation = p.reversed ? (es ? 'invertida' : 'reversed') : (es ? 'al derecho' : 'upright');
    addText(`${label} — ${name} (${orientation})`, 12, 2, true);
  });
  y += 8;

  if (reading.interpretation) {
    addText(es ? 'INTERPRETACIÓN' : 'INTERPRETATION', 13, 8, true);
    addText(reading.interpretation, 11, 16);
  } else {
    addText(
      es
        ? '(Esta lectura se guardó antes de que empezáramos a archivar la interpretación completa — solo quedaron las cartas.)'
        : '(This reading was saved before we started archiving the full interpretation — only the cards remain.)',
      10, 16
    );
  }

  (reading.followUps || []).forEach((f, i) => {
    addText(`${es ? 'Pregunta' : 'Question'} ${i + 1}: ${f.question}`, 11, 4, true);
    addText(f.answer, 11, 14);
  });
}

function arcanaCanUsePdf() {
  return !!(window.jspdf && window.jspdf.jsPDF);
}

// Descarga UNA lectura del historial como PDF.
window.arcanaExportReadingPDF = function (reading, lang) {
  if (!arcanaCanUsePdf()) return false;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  arcanaDrawReadingIntoDoc(doc, reading, lang);
  const dateKey = (reading.date || new Date().toISOString()).slice(0, 10);
  doc.save(`lux-astral-lectura-${dateKey}.pdf`);
  return true;
};

// Descarga TODO el historial en un solo PDF (una lectura por página).
window.arcanaExportReadingsBundlePDF = function (readings, lang) {
  if (!arcanaCanUsePdf() || !readings || readings.length === 0) return false;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  readings.forEach((reading, i) => {
    if (i > 0) doc.addPage();
    arcanaDrawReadingIntoDoc(doc, reading, lang);
  });
  doc.save(`lux-astral-historial-${new Date().toISOString().slice(0, 10)}.pdf`);
  return true;
};

// ===== Grimorio Personal (Cofre de Respuestas) -- 2026-09-10 =====
// Version especial del export del historial, exclusiva del Cofre: portada
// propia con diseño dorado sobre fondo profundo (sin depender de ninguna
// imagen externa, todo dibujado con las primitivas vectoriales de jsPDF)
// + un marco decorativo por página. Reusa arcanaDrawReadingIntoDoc para
// el cuerpo de cada lectura -- misma fuente de verdad que el PDF
// individual/del historial común, solo cambia el envoltorio.
// Nota: si una lectura es tan larga que arcanaDrawReadingIntoDoc agrega
// una página propia por desborde, esa página extra no lleva el marco
// (se dibuja una sola vez antes de cada lectura) -- es una limitación
// cosmética menor, no afecta el contenido.
function arcanaDrawCofreCover(doc, readings, lang) {
  const es = lang !== 'en';
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const gold = [212, 168, 90];
  const deep = [16, 11, 34];

  doc.setFillColor(deep[0], deep[1], deep[2]);
  doc.rect(0, 0, w, h, 'F');

  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(1);
  doc.rect(28, 28, w - 56, h - 56, 'S');
  doc.setLineWidth(0.5);
  doc.rect(34, 34, w - 68, h - 68, 'S');

  doc.setLineWidth(1.2);
  doc.circle(w / 2, 150, 34, 'S');
  doc.circle(w / 2, 150, 26, 'S');

  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.text('LUX ASTRAL', w / 2, 222, { align: 'center' });

  doc.setFontSize(30);
  doc.text(es ? 'GRIMORIO PERSONAL' : 'PERSONAL GRIMOIRE', w / 2, 260, { align: 'center' });

  doc.setLineWidth(0.7);
  doc.line(w / 2 - 90, 278, w / 2 + 90, 278);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(12);
  doc.setTextColor(220, 214, 232);
  const count = readings.length;
  doc.text(
    es
      ? `${count} respuesta${count === 1 ? '' : 's'} guardada${count === 1 ? '' : 's'} de tu Cofre`
      : `${count} saved answer${count === 1 ? '' : 's'} from your Chest`,
    w / 2, 310, { align: 'center' }
  );

  if (count) {
    const dates = readings.map((r) => new Date(r.date).getTime()).filter((t) => !isNaN(t));
    if (dates.length) {
      const min = new Date(Math.min(...dates));
      const max = new Date(Math.max(...dates));
      const fmt = (d) => d.toLocaleDateString(es ? 'es-CL' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.setFontSize(10);
      doc.setTextColor(160, 150, 190);
      doc.text(`${fmt(min)} — ${fmt(max)}`, w / 2, 328, { align: 'center' });
    }
  }

  doc.setFontSize(9);
  doc.setTextColor(120, 110, 150);
  const today = new Date();
  doc.text(
    es
      ? `Generado el ${today.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}`
      : `Generated on ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    w / 2, h - 50, { align: 'center' }
  );
}

function arcanaDrawCofrePageFrame(doc) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(212, 168, 90);
  doc.setLineWidth(0.6);
  doc.rect(24, 24, w - 48, h - 48, 'S');
}

// Descarga las lecturas del Cofre como un PDF con portada de diseño
// especial -- exclusivo del Cofre de Respuestas, distinto del PDF
// genérico del historial común.
window.arcanaExportGrimoire = function (readings, lang) {
  if (!arcanaCanUsePdf() || !readings || readings.length === 0) return false;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  arcanaDrawCofreCover(doc, readings, lang);
  const sorted = readings.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  sorted.forEach((reading) => {
    doc.addPage();
    arcanaDrawCofrePageFrame(doc);
    arcanaDrawReadingIntoDoc(doc, reading, lang);
  });
  doc.save(`lux-astral-grimorio-${new Date().toISOString().slice(0, 10)}.pdf`);
  return true;
};
