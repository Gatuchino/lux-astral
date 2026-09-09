// Starfield — animated canvas backdrop
function Starfield() {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];
    let animId;
    let w = 0, h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // regenerate stars — modest density to keep the main thread free
      const density = Math.min(90, Math.floor((w * h) / 22000));
      stars = [];
      for (let i = 0; i < density; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.4 + 0.2,
          baseA: Math.random() * 0.7 + 0.15,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.0016 + 0.0004,
          hue: Math.random() < 0.15 ? 'gold' : (Math.random() < 0.2 ? 'rose' : 'white'),
          drift: (Math.random() - 0.5) * 0.02,
        });
      }
    };

    let lastDraw = 0;
    const draw = (t) => {
      // throttle to ~30fps to keep CPU low
      if (t - lastDraw < 33) {
        animId = requestAnimationFrame(draw);
        return;
      }
      lastDraw = t;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        const alpha = s.baseA * twinkle;
        let color;
        if (s.hue === 'gold') color = `rgba(212, 168, 90, ${alpha})`;
        else if (s.hue === 'rose') color = `rgba(184, 106, 138, ${alpha * 0.8})`;
        else color = `rgba(240, 226, 192, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        // subtle drift
        s.x += s.drift;
        if (s.x < 0) s.x = w;
        if (s.x > w) s.x = 0;
      }
      animId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    animId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);
  return <canvas ref={canvasRef} id="starfield" />;
}

window.Starfield = Starfield;
