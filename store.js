(() => {
  const catalog = window.STARGATE_CATALOG;
  if (!catalog) return;
  const products = catalog.products;
  const money = new Intl.NumberFormat("ko-KR", { style: "currency", currency: catalog.currency, maximumFractionDigits: 0 });
  const bindings = {
    courses: ["course-koi-advanced", "course-algorithm-bundle", "course-kmo-number-combination", "course-koi-intro"],
    sub: ["subscription-bank-monthly", "subscription-bank-yearly", "subscription-mock-monthly"],
    books: ["book-koi-intro", "book-algorithm-vol1", "book-koi-past", "ebook-algorithm-set"],
    live: ["live-vacation", "live-koi-final", "consult-strategy", "mentoring-monthly"]
  };

  const label = (id) => {
    const item = products[id];
    return item ? `${item.name}${item.status === "planned" ? " (제작 예정)" : ""}` : id;
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
    modal.innerHTML = `<div class="product-modal__backdrop" data-modal-close></div><section class="product-modal__panel" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><button class="product-modal__close" type="button" data-modal-close aria-label="닫기">×</button><div id="product-modal-content"></div></section>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => { if (event.target.closest("[data-modal-close]")) closeModal(); });
    return modal;
  }

  function openModal(id) {
    const item = products[id];
    if (!item) return;
    const modal = ensureModal();
    const related = (item.related || []).map((relatedId) => `<button type="button" data-detail="${relatedId}">${label(relatedId)}</button>`).join("");
    document.getElementById("product-modal-content").innerHTML = `<div class="modal-kicker">${item.type.replaceAll("_", " ")} · ${item.sku}</div><h2 id="product-modal-title">${item.name}</h2><p class="modal-summary">${item.summary}</p><div class="modal-price">${money.format(item.amount)}${item.interval ? ` / ${item.interval === "month" ? "월" : "년"}` : ""}</div><h3>포함 콘텐츠</h3><ul>${item.contents.map((content) => `<li>${content}</li>`).join("")}</ul>${related ? `<h3>연결된 강의·교재</h3><div class="modal-related">${related}</div>` : ""}<a class="btn gold modal-checkout" href="/checkout.html?sku=${encodeURIComponent(item.sku)}">결제 단계로 이동</a>`;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    modal.querySelector(".product-modal__close").focus();
  }

  Object.entries(bindings).forEach(([sectionId, ids]) => {
    const cards = document.querySelectorAll(`#${sectionId} .card, #${sectionId} .plan`);
    cards.forEach((card, index) => {
      const id = ids[index];
      const item = products[id];
      if (!item) return;
      card.id = id;
      card.dataset.productId = id;
      const body = card.querySelector(".body") || card;
      body.querySelectorAll(":scope > .btn").forEach((button) => button.remove());
      const related = (item.related || []).map(label).join(" · ");
      body.insertAdjacentHTML("beforeend", `<div class="content-pair"><b>연계 콘텐츠</b><span>${related}</span></div><div class="product-actions"><button type="button" class="product-detail" data-detail="${id}">내용·연계 보기</button><a class="product-buy" href="/checkout.html?sku=${encodeURIComponent(item.sku)}">결제 준비</a></div>`);
    });
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-detail]");
    if (trigger) openModal(trigger.dataset.detail);
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
})();
