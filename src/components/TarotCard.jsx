// TarotCard — 3D flip card component
// Props:
//   card: card object from TAROT_CARDS.all
//   lang: 'es' | 'en'
//   revealed: boolean — if false shows the back (dorso)
//   reversed: boolean — if true, art rotated 180°
//   onClick: handler
//   style: extra styles
//   compact: shrink the number/name text
const CARD_ART = {
  fool: 'assets/cards/00-the-fool.jpg',
  magician: 'assets/cards/01-the-magician.jpg',
  priestess: 'assets/cards/02-high-priestess.jpg',
  empress: 'assets/cards/03-the-empress.jpg',
  emperor: 'assets/cards/04-the-emperor.jpg',
  hierophant: 'assets/cards/05-the-hierophant.jpg',
  lovers: 'assets/cards/06-the-lovers.jpg',
  chariot: 'assets/cards/07-the-chariot.jpg',
  strength: 'assets/cards/08-strength.jpg',
  hermit: 'assets/cards/09-the-hermit.jpg',
  wheel: 'assets/cards/10-wheel-of-fortune.jpg',
  justice: 'assets/cards/11-justice.jpg',
  hanged: 'assets/cards/12-the-hanged-man.jpg',
  death: 'assets/cards/13-death.jpg',
  temperance: 'assets/cards/14-temperance.jpg',
  devil: 'assets/cards/15-the-devil.jpg',
  tower: 'assets/cards/16-the-tower.jpg',
  star: 'assets/cards/17-the-star.jpg',
  moon: 'assets/cards/18-the-moon.jpg',
  sun: 'assets/cards/19-the-sun.jpg',
  judgement: 'assets/cards/20-judgement.jpg',
  world: 'assets/cards/21-the-world.jpg',
  ace_of_cups: 'assets/cards/22-ace-of-cups.jpg',
  two_of_cups: 'assets/cards/23-two-of-cups.jpg',
  three_of_cups: 'assets/cards/24-three-of-cups.jpg',
  four_of_cups: 'assets/cards/25-four-of-cups.jpg',
  five_of_cups: 'assets/cards/26-five-of-cups.jpg',
  six_of_cups: 'assets/cards/27-six-of-cups.jpg',
  seven_of_cups: 'assets/cards/28-seven-of-cups.jpg',
  eight_of_cups: 'assets/cards/29-eight-of-cups.jpg',
  nine_of_cups: 'assets/cards/30-nine-of-cups.jpg',
  ten_of_cups: 'assets/cards/31-ten-of-cups.jpg',
  page_of_cups: 'assets/cards/32-page-of-cups.jpg',
  knight_of_cups: 'assets/cards/33-knight-of-cups.jpg',
  queen_of_cups: 'assets/cards/34-queen-of-cups.jpg',
  king_of_cups: 'assets/cards/35-king-of-cups.jpg',
  // Oros (Pentacles) — mazo completo, 14/14
  ace_of_pentacles: 'assets/cards/36-ace-of-pentacles.jpg',
  two_of_pentacles: 'assets/cards/37-two-of-pentacles.jpg',
  three_of_pentacles: 'assets/cards/38-three-of-pentacles.jpg',
  four_of_pentacles: 'assets/cards/39-four-of-pentacles.jpg',
  five_of_pentacles: 'assets/cards/40-five-of-pentacles.jpg',
  six_of_pentacles: 'assets/cards/41-six-of-pentacles.jpg',
  seven_of_pentacles: 'assets/cards/42-seven-of-pentacles.jpg',
  eight_of_pentacles: 'assets/cards/43-eight-of-pentacles.jpg',
  nine_of_pentacles: 'assets/cards/44-nine-of-pentacles.jpg',
  ten_of_pentacles: 'assets/cards/45-ten-of-pentacles.jpg',
  page_of_pentacles: 'assets/cards/46-page-of-pentacles.jpg',
  knight_of_pentacles: 'assets/cards/47-knight-of-pentacles.jpg',
  queen_of_pentacles: 'assets/cards/48-queen-of-pentacles.jpg',
  king_of_pentacles: 'assets/cards/49-king-of-pentacles.jpg',
  // Espadas (Swords) — mazo completo, 14/14
  ace_of_swords: 'assets/cards/50-ace-of-swords.jpg',
  two_of_swords: 'assets/cards/51-two-of-swords.jpg',
  three_of_swords: 'assets/cards/52-three-of-swords.jpg',
  four_of_swords: 'assets/cards/53-four-of-swords.jpg',
  five_of_swords: 'assets/cards/54-five-of-swords.jpg',
  six_of_swords: 'assets/cards/55-six-of-swords.jpg',
  seven_of_swords: 'assets/cards/56-seven-of-swords.jpg',
  eight_of_swords: 'assets/cards/57-eight-of-swords.jpg',
  nine_of_swords: 'assets/cards/58-nine-of-swords.jpg',
  ten_of_swords: 'assets/cards/59-ten-of-swords.jpg',
  page_of_swords: 'assets/cards/60-page-of-swords.jpg',
  knight_of_swords: 'assets/cards/61-knight-of-swords.jpg',
  queen_of_swords: 'assets/cards/62-queen-of-swords.jpg',
  king_of_swords: 'assets/cards/63-king-of-swords.jpg',
  // Bastos (Wands) — mazo completo, 14/14 (78/78 total)
  ace_of_wands: 'assets/cards/64-ace-of-wands.jpg',
  two_of_wands: 'assets/cards/65-two-of-wands.jpg',
  three_of_wands: 'assets/cards/66-three-of-wands.jpg',
  four_of_wands: 'assets/cards/67-four-of-wands.jpg',
  five_of_wands: 'assets/cards/68-five-of-wands.jpg',
  six_of_wands: 'assets/cards/69-six-of-wands.jpg',
  seven_of_wands: 'assets/cards/70-seven-of-wands.jpg',
  eight_of_wands: 'assets/cards/71-eight-of-wands.jpg',
  nine_of_wands: 'assets/cards/72-nine-of-wands.jpg',
  ten_of_wands: 'assets/cards/73-ten-of-wands.jpg',
  page_of_wands: 'assets/cards/74-page-of-wands.jpg',
  knight_of_wands: 'assets/cards/75-knight-of-wands.jpg',
  queen_of_wands: 'assets/cards/76-queen-of-wands.jpg',
  king_of_wands: 'assets/cards/77-king-of-wands.jpg',
};

function TarotCard({ card, lang = 'es', revealed = false, reversed = false, onClick, style, compact }) {
  if (!card) return null;
  // Mazo completo: 78/78 cartas con arte propio en assets/cards/
  // (22 Arcanos Mayores + Copas + Oros + Espadas + Bastos, 14 c/u).
  // El fallback sol/luna ya no debería activarse nunca en producción.
  const artFile = CARD_ART[card.key]
    || (card.id % 2 === 0 ? 'assets/tarot-sun.jpg' : 'assets/tarot-moon.jpg');
  const name = lang === 'es' ? card.name_es : card.name_en;
  const num = card.id < 22
    ? toRoman(card.id)
    : (card.rank ? card.rank : '');
  return (
    <div
      className={`card3d ${revealed ? 'is-flipped' : ''} ${reversed ? 'is-reversed' : ''}`}
      onClick={onClick}
      style={style}
    >
      <div className="card3d-inner">
        <div className="card3d-back" />
        <div className="card3d-face">
          <div className="art" style={{ backgroundImage: `url(${artFile})` }} />
          <div className="num" style={compact ? { fontSize: 8 } : {}}>{num}</div>
          <div className="name" style={compact ? { fontSize: 7 } : {}}>{name}</div>
        </div>
      </div>
    </div>
  );
}

function toRoman(n) {
  if (n === 0) return '0';
  const romans = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
  ];
  let out = '';
  for (const [r, v] of romans) {
    while (n >= v) { out += r; n -= v; }
  }
  return out;
}

// Devuelve la URL de la ilustración de una carta (para usarla fuera del
// componente, ej. el lightbox de "ver imagen en grande" en Library.jsx).
window.getCardArtUrl = function (card) {
  if (!card) return null;
  return CARD_ART[card.key] || (card.id % 2 === 0 ? 'assets/tarot-sun.jpg' : 'assets/tarot-moon.jpg');
};

window.TarotCard = TarotCard;
window.toRoman = toRoman;
