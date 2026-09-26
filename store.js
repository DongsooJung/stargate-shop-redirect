(() => {
  const catalog = window.STARGATE_CATALOG;
  if (!catalog) return;
  const products = catalog.products;
  const lang = document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "ko";
  const translations = catalog.i18n?.[lang] || {};
  const localize = (id) => products[id] ? { ...products[id], ...(translations[id] || {}) } : null;
  const copy = lang === "en" ? { planned: "Coming soon", content: "Related content", detail: "Details", included: "What’s included", related: "Related courses & books", marketplaces: "Available from", externalNote: "Price, availability and shipping follow the seller's terms.", close: "Close", month: "month", year: "year", request: "Request an order", inquire: "Ask about availability", external: "Ask for a seller link", plannedAction: "Request launch notice", statusRequest: "Order request · no charge yet", statusInquiry: "Schedule and availability to be confirmed", statusExternal: "Seller link pending", statusPlanned: "Coming soon" } : { planned: "출시 예정", content: "연계 콘텐츠", detail: "상세 보기", included: "포함 콘텐츠", related: "연결된 강의·교재", marketplaces: "외부 판매처", externalNote: "가격·재고·배송은 판매처 기준입니다.", close: "닫기", month: "월", year: "년", request: "주문 신청", inquire: "일정·수강 문의", external: "판매처 문의", plannedAction: "출시 알림 신청", statusRequest: "이메일 주문 신청 · 결제 전 확인", statusInquiry: "일정·제공 가능 여부 확인 후 안내", statusExternal: "판매처 상품 링크 확인 중", statusPlanned: "출시 예정" };
  const checkoutSuffix = lang === "en" ? "&lang=en" : "";
  const money = new Intl.NumberFormat(lang === "en" ? "en-US" : "ko-KR", { style: "currency", currency: catalog.currency, maximumFractionDigits: 0 });
  const bindings = {
    courses: ["course-koi-advanced", "course-algorithm-bundle", "course-kmo-number-combination", "course-koi-intro"],
    sub: ["subscription-bank-monthly", "subscription-mock-monthly"],
    books: ["book-koi-intro", "book-algorithm-vol1", "book-koi-past", "ebook-algorithm-set"],
    live: ["live-vacation", "live-koi-final", "consult-strategy", "mentoring-monthly"]
  };

  const marketplaceStyle = document.createElement("style");
  marketplaceStyle.textContent = ".marketplace-box{margin-top:12px;padding:11px;border:1px solid #DDE5EE;border-radius:10px;background:#FAFBFC}.marketplace-title{font-size:11.5px;font-weight:800;color:var(--navy);margin-bottom:7px}.marketplace-links{display:grid;grid-template-columns:1fr 1fr;gap:7px}.marketplace-link{display:flex;align-items:center;justify-content:center;min-height:36px;padding:8px;border:1px solid #D7DEE8;border-radius:8px;background:#fff;color:#263B50;font-size:11.5px;font-weight:750;text-align:center;transition:.15s}.marketplace-link:hover{border-color:var(--gold);box-shadow:0 5px 14px rgba(11,42,74,.08);transform:translateY(-1px)}.marketplace-note{margin-top:6px;color:var(--gray);font-size:10.5px}.product-modal .marketplace-box{margin-top:18px}@media(max-width:420px){.marketplace-links{grid-template-columns:1fr}}";
  document.head.appendChild(marketplaceStyle);

  const marketplaceMarkup = (id, item) => {
    if (item.type !== "physical_book") return "";
    const marketplaces = catalog.marketplaces || {};
    const links = Object.values(marketplaces).map((marketplace) => {
      const direct = marketplace.links?.[item.sku];
      if (!direct) return "";
      const href = direct;
      const text = lang === "en" ? marketplace.en : marketplace.ko;
      return `<a class="marketplace-link" href="${href}" target="_blank" rel="noopener noreferrer nofollow sponsored" aria-label="${text}: ${item.name}">${text} ↗</a>`;
    }).join("");
    if (!links) return "";
    return `<div class="marketplace-box"><div class="marketplace-title">${copy.marketplaces}</div><div class="marketplace-links">${links}</div><div class="marketplace-note">${copy.externalNote}</div></div>`;
  };

  const salesMode = (id) => catalog.availability?.[id] || "consultation";
  const contactLink = (item, purpose) => {
    const subject = encodeURIComponent(`[${item.sku}] ${item.name} · ${purpose}`);
    const body = encodeURIComponent(lang === "en"
      ? `Product: ${item.name}\nSKU: ${item.sku}\nName:\nContact:\nQuestions:`
      : `상품명: ${item.name}\nSKU: ${item.sku}\n신청자 이름:\n연락처:\n문의사항:`);
    return `mailto:ceo@stargateedu.co.kr?subject=${subject}&body=${body}`;
  };
  const actionFor = (id, item, modal = false) => {
    const mode = salesMode(id);
    const labels = { request: [copy.request, copy.statusRequest], consultation: [copy.inquire, copy.statusInquiry], external: [copy.external, copy.statusExternal], planned: [copy.plannedAction, copy.statusPlanned] };
    const [label, status] = labels[mode] || labels.consultation;
    const direct = mode === "external" && Object.values(catalog.marketplaces || {}).map(m => m.links?.[item.sku]).find(Boolean);
    const href = direct || (mode === "request" ? `/checkout.html?sku=${encodeURIComponent(item.sku)}${checkoutSuffix}` : contactLink(item, label));
    const extra = direct ? ' target="_blank" rel="noopener noreferrer nofollow sponsored"' : "";
    const cls = modal ? "btn gold modal-checkout" : "product-buy";
    return `<div class="sale-status">${status}</div><a class="${cls}" href="${href}"${extra}>${label}</a>`;
  };

  const label = (id) => {
    const item = localize(id);
    return item ? `${item.name}${item.status === "planned" ? ` (${copy.planned})` : ""}` : id;
  };

  function closeModal() {
    const modal = document.getElementById("product-modal");
    if (modal) modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function ensureModal() {
    let modal = document.getElementById("product-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "product-modal";
    modal.className = "product-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `<div class="product-modal__backdrop" data-modal-close></div><section class="product-modal__panel" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><button class="product-modal__close" type="button" data-modal-close aria-label="${copy.close}">×</button><div id="product-modal-content"></div></section>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => { if (event.target.closest("[data-modal-close]")) closeModal(); });
    return modal;
  }

  function openModal(id) {
    const item = localize(id);
    if (!item) return;
    const modal = ensureModal();
    const related = (item.related || []).map((relatedId) => `<button type="button" data-detail="${relatedId}">${label(relatedId)}</button>`).join("");
    document.getElementById("product-modal-content").innerHTML = `<div class="modal-kicker">${item.type.replaceAll("_", " ")} · ${item.sku}</div><h2 id="product-modal-title">${item.name}</h2><p class="modal-summary">${item.summary}</p><div class="modal-price">${money.format(item.amount)}${item.interval ? ` / ${item.interval === "month" ? copy.month : copy.year}` : ""}</div><h3>${copy.included}</h3><ul>${item.contents.map((content) => `<li>${content}</li>`).join("")}</ul>${related ? `<h3>${copy.related}</h3><div class="modal-related">${related}</div>` : ""}${actionFor(id, item, true)}${marketplaceMarkup(id, item)}`;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    modal.querySelector(".product-modal__close").focus();
  }

  Object.entries(bindings).forEach(([sectionId, ids]) => {
    const cards = document.querySelectorAll(`#${sectionId} .card, #${sectionId} .plan`);
    cards.forEach((card, index) => {
      const id = ids[index];
      const item = localize(id);
      if (!item) return;
      card.id = id;
      card.dataset.productId = id;
      const body = card.querySelector(".body") || card;
      body.querySelectorAll(":scope > .btn").forEach((button) => button.remove());
      const related = (item.related || []).map(label).join(" · ");
      body.insertAdjacentHTML("beforeend", `<div class="content-pair"><b>${copy.content}</b><span>${related}</span></div><div class="product-actions"><button type="button" class="product-detail" data-detail="${id}">${copy.detail}</button>${actionFor(id, item)}</div>${marketplaceMarkup(id, item)}`);
    });
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-detail]");
    if (trigger) openModal(trigger.dataset.detail);
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
})();
