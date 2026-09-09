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
