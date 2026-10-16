/* ==========================================================================
   Espontáneos Travel — Plantillas HTML compartidas (navegador y Node).
   main.js las usa para pintar en el idioma elegido; tools/build-static.js
   las usa para dejar el HTML base en español dentro de index.html (SEO y
   visitantes sin JavaScript). Una sola plantilla = mismo resultado.
   ========================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EspoRender = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const ICON = {
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>'
  };

  /* Tarjeta de experiencia.
     base: tour de js/data.js (id, cat, name, sum) · info: EspoData.tour() o null
     ctx: { t(key), lang, catLabel(cat), img: { src, srcset, sizes } , summary, fmtDur, fmtHorario, delay } */
  function card(base, info, ctx) {
    const t = ctx.t;
    const name = (info && info.nombre) || base.name;
    const dur = info ? ctx.fmtDur(info.dur) : "";
    const hor = info ? ctx.fmtHorario(info.horario) : "";
    const bucket = info && ctx.durBucket ? ctx.durBucket(info.dur) : "";
    const search = [name, base.name, ctx.catLabel(base.cat), ctx.summary, info && info.codigo].join(" ").toLowerCase();
    // Sin precio en la tarjeta: la tarifa directa solo sale al cotizar con Jenny (con su beneficio por convenio)
    const price = `<span class="tour-card__price"><b class="quote">${esc(t("jenny_quote"))}</b></span>`;
    const im = ctx.img || {};
    return `<article class="tour-card reveal" data-delay="${ctx.delay || 1}" data-id="${esc(base.id)}" data-cat="${esc(base.cat)}" data-dur="${esc(bucket)}" data-search="${esc(search)}" tabindex="0" role="button" aria-label="${esc(t("card_cta") + ": " + name)}">
  <div class="tour-card__media">
    <img src="${esc(im.src || "")}"${im.srcset ? ` srcset="${esc(im.srcset)}" sizes="(max-width: 700px) 92vw, 380px"` : ""} alt="${esc(name)}" loading="lazy" decoding="async" width="640" height="427"${im.attrs || ""}>
    <span class="tour-card__cat">${esc(ctx.catLabel(base.cat))}</span>
  </div>
  <div class="tour-card__body">
    <h3>${esc(name)}</h3>
    ${info ? `<ul class="tour-card__facts">
      <li>${ICON.clock}<span>${esc(dur)}</span></li>
      <li>${ICON.cal}<span>${esc(hor)}</span></li>
    </ul>` : ""}
    <p class="tour-card__desc">${esc(ctx.summary)}</p>
    <div class="tour-card__foot">${price}<span class="tour-card__more">${esc(t("card_cta"))}${ICON.arrow}</span></div>
  </div>
</article>`;
  }

  /* Vista general de experiencias: una foto por categoría y la lista desplegable de sus experiencias.
     groups: [{ id, label, img: { src, srcset }, items: [{ id, name, dur, href, thumb }] }] · ctx: { t }
     Cada experiencia enlaza a su página propia (Google la sigue); main.js abre la ficha con un clic normal. */
  function catTiles(groups, ctx) {
    const t = ctx.t;
    return groups.map((g, i) => `<details class="cat-tile reveal" name="cat-tiles" data-cat="${esc(g.id)}" data-delay="${(i % 4) + 1}">
  <summary>
    <span class="cat-tile__media">${g.img && g.img.src ? `<img src="${esc(g.img.src)}"${g.img.srcset ? ` srcset="${esc(g.img.srcset)}" sizes="(max-width: 640px) 130px, (max-width: 1100px) 46vw, 340px"` : ""} alt="" loading="lazy" decoding="async" width="640" height="427">` : ""}</span>
    <span class="cat-tile__body">
      <b class="cat-tile__name">${esc(g.label)}</b>
      <small class="cat-tile__count">${esc((g.items.length === 1 ? t("results_1") : t("results_n")).replace("{n}", g.items.length))}</small>
      <span class="cat-tile__peek">${esc(g.items.slice(0, 3).map(x => x.name).join(" · "))}${g.items.length > 3 ? "…" : ""}</span>
      <span class="cat-tile__more">${esc(t("cat_more"))}${ICON.chev}</span>
    </span>
  </summary>
  <ul class="cat-tile__list">
    ${g.items.map(x => `<li><a href="${esc(x.href)}" data-id="${esc(x.id)}">${x.thumb ? `<img src="${esc(x.thumb)}" alt="" loading="lazy" decoding="async" width="96" height="64">` : `<span class="cat-tile__nothumb" aria-hidden="true">☕</span>`}<span><b>${esc(x.name)}</b>${x.dur ? `<small>${esc(x.dur)}</small>` : ""}</span></a></li>`).join("\n    ")}
  </ul>
  <button type="button" class="cat-tile__cards" data-cat="${esc(g.id)}">${esc(t("cat_cards"))}</button>
</details>`).join("\n");
  }

  /* FAQ: items [{ id, q, a }] */
  function faq(items) {
    return items.map(f => `<details class="faq-item reveal" id="faq-${esc(f.id)}">
  <summary><span>${esc(f.q)}</span>${ICON.chev}</summary>
  <div class="faq-a">${esc(f.a)}</div>
</details>`).join("\n");
  }

  /* Sostenibilidad: s = EspoData.sost(lang) */
  function sost(s, ctx) {
    const t = ctx.t;
    return `<div class="sust__pillars">
  ${s.pilares.map(p => `<article class="sust__pillar reveal">
    <span class="sust__icon" aria-hidden="true">${esc(p.icono)}</span>
    <span class="sust__kind">${esc(p.nombre)}</span>
    <h3>${esc(p.titulo)}</h3>
    <ul>${p.acciones.map(a => `<li>${ICON.check}<span>${esc(a)}</span></li>`).join("")}</ul>
  </article>`).join("\n  ")}
</div>
<h3 class="sust__sub">${esc(t("sust_stories"))}</h3>
<div class="sust__stories">
  ${s.historias.map(h => `<article class="story reveal"><span class="story__avatar" aria-hidden="true">${esc(h.nombre.charAt(0))}</span><div><b>${esc(h.nombre)}</b><span class="story__role">${esc(h.rol)}</span><p>${esc(h.texto)}</p></div></article>`).join("\n  ")}
</div>`;
  }

  /* Reseñas de Google: r = EspoData.resenas() · ctx: { t, lang }
     Las reseñas se muestran en su idioma original (lang del bloque). Van en una fila que se desplaza sola:
     la lista se repite una vez (copia oculta para lectores de pantalla) para que el movimiento no tenga cortes. */
  const LOCALE = { es: "es-CO", en: "en-GB", fr: "fr-FR", de: "de-DE", pt: "pt-BR" };
  function score(n, lang) { return new Intl.NumberFormat(LOCALE[lang] || "es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n); }
  function month(ym, lang) {
    if (!ym) return "";
    const d = new Date(ym + "-15T12:00:00Z");
    return isNaN(d) ? "" : new Intl.DateTimeFormat(LOCALE[lang] || "es-CO", { month: "short", year: "numeric", timeZone: "UTC" }).format(d);
  }
  const stars = n => "★★★★★".slice(0, Math.round(n)) + "☆☆☆☆☆".slice(0, 5 - Math.round(n));
  function resenas(r, ctx) {
    const t = ctx.t, lang = ctx.lang || "es", sc = score(r.calificacion, lang);
    const ext = ' target="_blank" rel="noopener"';
    return `<div class="reviews__summary reveal">
  <span class="reviews__score">${esc(sc)}</span>
  <span class="reviews__stars" role="img" aria-label="${esc(t("rev_stars").replace("{r}", sc))}">${stars(r.calificacion)}</span>
</div>
${r.destacadas.length ? `<div class="reviews__marquee">
  <div class="reviews__track">
  ${[0, 1].map(copy => r.destacadas.map(d => `<figure class="review"${copy ? ' aria-hidden="true"' : ""}>
    <span class="review__stars" role="img" aria-label="${esc(t("rev_stars").replace("{r}", d.estrellas))}">${stars(d.estrellas)}</span>
    <blockquote${d.idioma ? ` lang="${esc(d.idioma)}"` : ""}>${esc(d.texto)}</blockquote>
    <figcaption><span class="review__ava" aria-hidden="true">${esc(d.nombre.charAt(0))}</span><b>${esc(d.nombre)}</b>${d.fecha ? `<span>${esc(month(d.fecha, lang))}</span>` : ""}</figcaption>
  </figure>`).join("\n  ")).join("\n  ")}
  </div>
</div>` : ""}
<div class="reviews__cta">
  ${r.url_ver ? `<a class="btn btn--ghost" href="${esc(r.url_ver)}"${ext}>${esc(t("rev_all"))}</a>` : ""}
  ${r.url_escribir ? `<a class="btn btn--primary" href="${esc(r.url_escribir)}"${ext}>${esc(t("rev_write"))}</a>` : ""}
</div>
<p class="reviews__note">${esc(t("rev_note"))}</p>`;
  }

  /* Planes oficiales (con alojamiento) + itinerarios sugeridos */
  function planes(oficiales, sugeridos, ctx) {
    const t = ctx.t;
    const off = oficiales.map(p => `<article class="plan-card reveal">
    <span class="plan-card__tag">${esc(t("plan_nights").replace("{n}", p.noches))}</span>
    <h4>${esc(p.nombre)}</h4>
    <p>${esc(p.incluye)}</p>
    <a class="btn btn--primary btn--sm" data-plan-wa="${esc(p.nombre)}" href="${esc(ctx.waPlan(p.nombre))}" target="_blank" rel="noopener">${esc(t("plan_cta"))}</a>
  </article>`).join("\n  ");
    // Itinerarios sugeridos: actividades agrupadas por día (etiqueta "Día N" solo si dura más de un día).
    // Nombres largos se acortan antes de ":" ("Aguas termales: Santa Rosa…" → "Aguas termales").
    const short = n => { const i = String(n).indexOf(": "); return i >= 12 ? n.slice(0, i) : n; };
    const days = p => { const g = []; p.stops.forEach(s => { const last = g[g.length - 1]; if (last && last.d === s.d) last.items.push(s.name); else g.push({ d: s.d, items: [s.name] }); }); return g; };
    const sug = sugeridos.map(p => `<article class="plan-card plan-card--soft reveal">
    <span class="plan-card__tag">${esc(t("plan_days").replace("{n}", p.days))}</span>
    <h4>${esc(p.nombre)}</h4>
    <div class="plan-card__days">${days(p).map(g => `<div class="plan-day">${p.days > 1 ? `<span class="plan-day__n">${esc(p.dayLabel)} ${g.d}</span>` : ""}<ul>${g.items.map(n => `<li>${esc(short(n))}</li>`).join("")}</ul></div>`).join("")}</div>
    <button class="btn btn--ghost btn--sm" type="button" data-plan-jenny="${esc(p.id)}">${esc(t("plan_see"))}</button>
  </article>`).join("\n  ");
    return `<h3 class="plans__sub">${esc(t("plans_official"))}</h3>
<div class="plans__grid">
  ${off}
</div>
<p class="plans__note"><b>${esc(t("plan_noincl"))}:</b> ${esc(ctx.noIncluye)}</p>
<h3 class="plans__sub">${esc(t("plans_suggested"))}</h3>
<div class="plans__grid plans__grid--4">
  ${sug}
</div>`;
  }

  return { esc, card, catTiles, faq, sost, resenas, score, planes, ICON };
});
