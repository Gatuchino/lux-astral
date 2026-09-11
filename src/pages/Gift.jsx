// Regalos canjeables por email -- idea #9 de la auditoría de producto (a
// pedido de Christian). Reusa exactamente el mismo patrón de pago que
// SessionCheckoutPage (PayPal intent=capture, un solo pago) pero en vez
// de reservar una sesión, el backend genera un código ("gift-checkout" /
// "gift-confirm") que otra persona canjea en su propia cuenta
// ("redeem-gift", ver acciones en booking.mts/local-server.js).
const GIFT_PLAN_META = {
  luna: { name: 'Luna', es: 'Para quien recién empieza a mirar sus cartas.', en: 'For someone just starting to read their cards.' },
  estrella: { name: 'Estrella', es: 'Más profundidad, respuestas más largas y el Cofre de Respuestas.', en: 'More depth, longer answers, and the Answer Chest.' },
  oraculo: { name: 'Oráculo', es: 'La experiencia completa, con una sesión en vivo gratis por mes.', en: 'The full experience, with one free live session a month.' },
};
const GIFT_DEFAULT_PRICES = {
  luna_month: 6, luna_year: 60, estrella_month: 9, estrella_year: 90, oraculo_month: 24, oraculo_year: 240,
};
function giftPriceFor(planPrices, key) {
  const raw = planPrices && planPrices[key];
  const n = raw != null ? Number(raw) : GIFT_DEFAULT_PRICES[key];
  return Number.isFinite(n) ? n : GIFT_DEFAULT_PRICES[key];
}

function GiftPage({ lang, setRoute, profile, requireAuth }) {
  const es = lang === 'es';
  const [tab, setTab] = React.useState('give'); // give | redeem

  React.useEffect(() => {
    if (!profile || !profile.loggedIn) requireAuth && requireAuth(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile && profile.loggedIn]);

  if (!profile || !profile.loggedIn) {
    return (
      <div className="page gift-page gift-gate">
        <p className="italic">{es ? 'Iniciá sesión para regalar o canjear una membresía.' : 'Sign in to gift or redeem a membership.'}</p>
      </div>
    );
  }

  return (
    <div className="page gift-page">
      <div className="page-head">
        <div className="eyebrow">— {es ? 'Regalos' : 'Gifts'} —</div>
        <h1 className="page-title">{es ? 'Regalá o canjeá Lux Astral' : 'Gift or redeem Lux Astral'}</h1>
        <p className="page-sub italic">
          {es
            ? 'Regalá una membresía a quien quieras -- paga con PayPal, recibe un código por email, lo canjea cuando quiera.'
            : 'Gift a membership to anyone -- pay with PayPal, they get a code by email, they redeem it whenever they like.'}
        </p>
        <div className="billing-toggle gift-tabs" role="tablist">
          <button className={`bt-opt ${tab === 'give' ? 'is-active' : ''}`} onClick={() => setTab('give')} role="tab" aria-selected={tab === 'give'}>
            🎁 {es ? 'Regalar' : 'Give a gift'}
          </button>
          <button className={`bt-opt ${tab === 'redeem' ? 'is-active' : ''}`} onClick={() => setTab('redeem')} role="tab" aria-selected={tab === 'redeem'}>
            ✦ {es ? 'Canjear un código' : 'Redeem a code'}
          </button>
        </div>
      </div>

      {tab === 'give' ? <GiftGiveSection lang={lang} profile={profile} /> : <GiftRedeemSection lang={lang} setRoute={setRoute} />}

      <style>{`
        .gift-page { max-width: 640px; }
        .gift-gate { text-align: center; padding: 80px 0; }
        .page-head { text-align: center; margin-bottom: 36px; }
        .page-title { font-size: clamp(30px, 5vw, 44px); font-weight: 400; margin-bottom: 10px; }
        .page-sub { font-size: 16px; color: var(--ink-soft); max-width: 480px; margin: 0 auto; }
        .gift-tabs { margin-top: 22px; }

        .billing-toggle {
          display: inline-flex; gap: 4px; margin-top: 0; padding: 5px;
          border: 1px solid var(--line); border-radius: 999px; background: rgba(26, 20, 56, 0.4);
        }
        .bt-opt {
          background: transparent; border: none; color: var(--ink-soft);
          font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
          padding: 10px 22px; border-radius: 999px; cursor: pointer; transition: all 0.25s ease;
          display: inline-flex; align-items: center; gap: 10px;
        }
        .bt-opt:hover { color: var(--ink); }
        .bt-opt.is-active { background: var(--gold); color: var(--bg); }

        .gift-plan-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 26px; }
        .gift-plan-opt {
          text-align: left; cursor: pointer; border-radius: 14px; padding: 16px;
          border: 1px solid var(--line); background: var(--bg-2);
          transition: border-color 0.2s, transform 0.2s;
        }
        .gift-plan-opt:hover { transform: translateY(-2px); }
        .gift-plan-opt.is-active { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
        .gift-plan-name { font-family: 'Cinzel', serif; font-size: 15px; color: var(--gold); margin-bottom: 4px; }
        .gift-plan-desc { font-size: 13px; color: var(--ink-soft); line-height: 1.4; margin-bottom: 10px; }
        .gift-plan-price { font-size: 20px; color: var(--ink); }
        .gift-plan-price span { font-size: 12px; color: var(--ink-soft); }

        .gift-field { margin-bottom: 16px; }
        .gift-field label { display: block; font-size: 13px; color: var(--ink-soft); margin-bottom: 6px; }
        .gift-field input, .gift-field textarea {
          width: 100%; padding: 11px 14px; border-radius: 10px; border: 1px solid var(--line);
          background: var(--bg-2); color: var(--ink); font: inherit;
        }
        .gift-field textarea { resize: vertical; min-height: 70px; }
        .gift-hint { font-size: 12px; color: var(--ink-soft); margin-top: 4px; }

        .gift-total { display: flex; justify-content: space-between; align-items: baseline; padding: 14px 0; border-top: 1px solid var(--line); margin-bottom: 18px; }
        .gift-total-label { font-size: 14px; color: var(--ink-soft); }
        .gift-total-price { font-family: 'Cinzel', serif; font-size: 24px; color: var(--gold); }

        .gift-code-box {
          text-align: center; padding: 28px; border-radius: 16px;
          background: linear-gradient(160deg, rgba(90,58,138,0.12), rgba(15,10,36,0.4));
          border: 1px solid var(--line-strong);
        }
        .gift-code-value {
          display: inline-block; margin: 14px 0; padding: 12px 22px; font-family: monospace;
          font-size: 20px; letter-spacing: 0.06em; color: var(--gold);
          background: rgba(212,168,90,0.12); border: 1px dashed var(--gold); border-radius: 10px;
        }
        .gift-error { color: #e08080; font-size: 13px; margin-top: 10px; }
        .checkout-trust-note {
          display: flex; align-items: center; gap: 8px; margin-top: 14px;
          padding: 12px 14px; border-radius: 10px;
          background: rgba(90, 200, 140, 0.08); border: 1px solid rgba(90, 200, 140, 0.25);
          font-size: 12.5px; line-height: 1.4; color: var(--ink-soft);
        }
        .gift-redeem-form { display: flex; gap: 10px; flex-wrap: wrap; }
        .gift-redeem-form input { flex: 1; min-width: 200px; text-transform: uppercase; letter-spacing: 0.04em; }
      `}</style>
    </div>
  );
}

function GiftGiveSection({ lang, profile }) {
  const es = lang === 'es';
  const [planKey, setPlanKey] = React.useState('luna');
  const [billing, setBilling] = React.useState('year');
  const [recipientEmail, setRecipientEmail] = React.useState('');
  const [recipientName, setRecipientName] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [step, setStep] = React.useState('form'); // form | payment | confirming | done | cancelled | error
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState(null); // { code, planKey, billing, emailSent }

  const [plansConfig, setPlansConfig] = React.useState({ paypalClientId: '', planPrices: null });
  React.useEffect(() => { window.arcanaSubscriptionPlans().then(setPlansConfig).catch(() => {}); }, []);

  const priceKey = `${planKey}_${billing}`;
  const price = giftPriceFor(plansConfig.planPrices, priceKey);

  const [sdkLoaded, setSdkLoaded] = React.useState(false);
  const sdkLoadingRef = React.useRef(false);
  const buttonBoxRef = React.useRef(null);
  const renderedForRef = React.useRef(null);
  const ctxRef = React.useRef({ planKey, billing, recipientEmail, recipientName, message });

  React.useEffect(() => {
    ctxRef.current = { planKey, billing, recipientEmail: recipientEmail.trim().toLowerCase(), recipientName: recipientName.trim(), message: message.trim() };
  }, [planKey, billing, recipientEmail, recipientName, message]);

  React.useEffect(() => {
    if (step !== 'payment') return undefined;
    if (!plansConfig.paypalClientId) return undefined;
    if (window.paypal && window.__arcanaPaypalSdkKind === 'capture') { setSdkLoaded(true); return undefined; }
    if (sdkLoadingRef.current) return undefined;
    sdkLoadingRef.current = true;
    const s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(plansConfig.paypalClientId) + '&currency=USD&intent=capture';
    s.onload = () => { window.__arcanaPaypalSdkKind = 'capture'; sdkLoadingRef.current = false; setSdkLoaded(true); };
    s.onerror = () => { sdkLoadingRef.current = false; setError(es ? 'No se pudo cargar PayPal.' : 'Could not load PayPal.'); };
    document.body.appendChild(s);
    return undefined;
  }, [step, plansConfig.paypalClientId]);

  React.useEffect(() => {
    if (step !== 'payment' || !sdkLoaded || !window.paypal || !buttonBoxRef.current) return;
    const renderKey = planKey + ':' + billing;
    if (renderedForRef.current === renderKey) return;
    renderedForRef.current = renderKey;
    buttonBoxRef.current.innerHTML = '';
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', label: 'pay' },
      createOrder: () => {
        setError('');
        const ctx = ctxRef.current;
        return window.arcanaGiftCheckout({
          planKey: ctx.planKey, billing: ctx.billing,
          recipientEmail: ctx.recipientEmail || undefined, recipientName: ctx.recipientName || undefined,
          message: ctx.message || undefined,
        }).then((res) => res.orderId);
      },
      onApprove: (data) => {
        setStep('confirming');
        return window.arcanaGiftConfirm(data.orderID, lang)
          .then((res) => {
            if (res.status === 'paid') { setResult(res); setStep('done'); }
            else { setStep('error'); }
          })
          .catch(() => setStep('error'));
      },
      onCancel: () => setStep('cancelled'),
      onError: () => setError(es ? 'Ocurrió un error con PayPal.' : 'Something went wrong with PayPal.'),
    }).render(buttonBoxRef.current);
  }, [step, sdkLoaded, planKey, billing, lang]);

  if (step === 'done' && result) {
    const planName = GIFT_PLAN_META[result.planKey] ? GIFT_PLAN_META[result.planKey].name : result.planKey;
    return (
      <div className="gift-code-box">
        <div style={{ fontSize: 34 }}>🎁</div>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, margin: '10px 0' }}>
          {es ? `¡Listo! Regalaste ${planName}` : `Done! You gifted ${planName}`}
        </h2>
        <p className="italic" style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
          {result.emailSent
            ? (es ? 'Ya le mandamos el código por email a la destinataria/o.' : 'We already emailed the code to the recipient.')
            : (es ? 'Copiá este código y compartilo vos misma/o:' : 'Copy this code and share it yourself:')}
        </p>
        <div className="gift-code-value">{result.code}</div>
        <div>
          <button
            className="btn btn-ghost"
            onClick={() => {
              try { navigator.clipboard.writeText(result.code); } catch (e) {}
            }}
          >{es ? 'Copiar código' : 'Copy code'}</button>
        </div>
      </div>
    );
  }

  if (step === 'confirming') {
    return <p className="italic" style={{ textAlign: 'center' }}>{es ? 'Confirmando el pago…' : 'Confirming payment…'}</p>;
  }

  if (step === 'cancelled' || step === 'error') {
    return (
      <div style={{ textAlign: 'center' }}>
        <p className="italic" style={{ color: 'var(--ink-soft)' }}>
          {step === 'cancelled'
            ? (es ? 'Cancelaste el pago -- no se cobró nada.' : "You cancelled the payment -- nothing was charged.")
            : (es ? 'Algo falló al confirmar el pago. Si te cobraron, escribinos a contacto@luxastral.com.' : 'Something failed confirming the payment. If you were charged, write to contacto@luxastral.com.')}
        </p>
        <button className="btn btn-ghost" onClick={() => { setStep('form'); setError(''); }}>{es ? '← Volver a intentar' : '← Try again'}</button>
      </div>
    );
  }

  return (
    <div>
      <div className="gift-plan-grid">
        {['luna', 'estrella', 'oraculo'].map((key) => (
          <button key={key} className={`gift-plan-opt ${planKey === key ? 'is-active' : ''}`} onClick={() => setPlanKey(key)}>
            <div className="gift-plan-name">{GIFT_PLAN_META[key].name}</div>
            <div className="gift-plan-desc">{es ? GIFT_PLAN_META[key].es : GIFT_PLAN_META[key].en}</div>
            <div className="gift-plan-price">
              ${giftPriceFor(plansConfig.planPrices, `${key}_${billing}`)} <span>{billing === 'year' ? (es ? '/año' : '/year') : (es ? '/mes' : '/month')}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="billing-toggle" role="tablist" style={{ marginBottom: 26 }}>
        <button className={`bt-opt ${billing === 'month' ? 'is-active' : ''}`} onClick={() => setBilling('month')} role="tab" aria-selected={billing === 'month'}>
          {es ? 'Mensual' : 'Monthly'}
        </button>
        <button className={`bt-opt ${billing === 'year' ? 'is-active' : ''}`} onClick={() => setBilling('year')} role="tab" aria-selected={billing === 'year'}>
          {es ? 'Anual' : 'Yearly'}
        </button>
      </div>

      {step === 'form' && (
        <>
          <div className="gift-field">
            <label>{es ? 'Email de quien recibe el regalo (opcional)' : "Recipient's email (optional)"}</label>
            <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="nombre@email.com" />
            <div className="gift-hint">
              {es ? 'Si lo dejás vacío, te damos el código a vos para que lo compartas como quieras.' : "If you leave it blank, we'll give you the code to share however you like."}
            </div>
          </div>
          <div className="gift-field">
            <label>{es ? 'Su nombre (opcional)' : 'Their name (optional)'}</label>
            <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} maxLength={80} />
          </div>
          <div className="gift-field">
            <label>{es ? 'Un mensaje para acompañar el regalo (opcional)' : 'A message to go with the gift (optional)'}</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={240} />
          </div>

          <div className="gift-total">
            <span className="gift-total-label">{es ? 'Total a pagar' : 'Total to pay'}</span>
            <span className="gift-total-price">${price} USD</span>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep('payment')}>
            {es ? 'Ir a pagar con PayPal' : 'Go to PayPal payment'}
          </button>
        </>
      )}

      {step === 'payment' && (
        <>
          <p className="italic" style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 14 }}>
            {es ? `Regalando ${GIFT_PLAN_META[planKey].name} (${billing === 'year' ? 'anual' : 'mensual'}) — $${price} USD` : `Gifting ${GIFT_PLAN_META[planKey].name} (${billing === 'year' ? 'yearly' : 'monthly'}) — $${price} USD`}
          </p>
          <div ref={buttonBoxRef} />
          <p className="checkout-trust-note">
            🔒 {es
              ? 'Pago seguro: tu tarjeta se procesa directo en los servidores de PayPal, nunca pasa por Lux Astral.'
              : 'Secure payment: your card is processed directly by PayPal, it never passes through Lux Astral.'}
          </p>
          {error && <p className="gift-error">{error}</p>}
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => setStep('form')}>{es ? '← Volver' : '← Back'}</button>
        </>
      )}
    </div>
  );
}

function GiftRedeemSection({ lang, setRoute }) {
  const es = lang === 'es';
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState(null); // { planKey, expiresAt }

  const submit = (e) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError('');
    window.arcanaRedeemGift(code.trim())
      .then((res) => setResult(res))
      .catch((err) => setError(err.message || (es ? 'No se pudo canjear el código.' : 'Could not redeem the code.')))
      .finally(() => setBusy(false));
  };

  if (result) {
    const planName = GIFT_PLAN_META[result.planKey] ? GIFT_PLAN_META[result.planKey].name : result.planKey;
    const until = (() => {
      try { return new Date(result.expiresAt).toLocaleDateString(es ? 'es-CL' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }); }
      catch (e) { return result.expiresAt; }
    })();
    return (
      <div className="gift-code-box">
        <div style={{ fontSize: 34 }}>✦</div>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, margin: '10px 0' }}>
          {es ? `¡Listo! Ya tenés ${planName}` : `Done! You now have ${planName}`}
        </h2>
        <p className="italic" style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
          {es ? `Activo hasta el ${until}.` : `Active until ${until}.`}
        </p>
        <button className="btn btn-primary" onClick={() => setRoute({ page: 'dashboard' })}>{es ? 'Ir a mi panel' : 'Go to my dashboard'}</button>
      </div>
    );
  }

  return (
    <form className="gift-redeem-form" onSubmit={submit}>
      <input
        type="text" value={code} onChange={(e) => setCode(e.target.value)}
        placeholder={es ? 'Código, ej. LUXGIFT-XXXXXXXX' : 'Code, e.g. LUXGIFT-XXXXXXXX'}
      />
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? (es ? 'Canjeando…' : 'Redeeming…') : (es ? 'Canjear' : 'Redeem')}
      </button>
      {error && <p className="gift-error" style={{ width: '100%' }}>{error}</p>}
    </form>
  );
}

window.GiftPage = GiftPage;
