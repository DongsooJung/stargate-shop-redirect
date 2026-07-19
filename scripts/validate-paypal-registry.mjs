import fs from "node:fs";
import vm from "node:vm";

const requiredColumns = [
  "display_order", "sku", "product_name", "catalog_type", "price_krw",
  "paypal_setup_type", "billing_interval", "shipping_required", "fulfillment",
  "related_content", "catalog_status", "paypal_url", "operator_notes"
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function readCatalog() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync("catalog.js", "utf8"), context);
  return Object.values(context.window.STARGATE_CATALOG.products);
}

function readPaymentSlots() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync("payment-links.js", "utf8"), context);
  return context.window.STARGATE_PAYMENTS.links;
}

const [headers, ...csvRows] = parseCsv(fs.readFileSync("paypal-products.csv", "utf8"));
const failures = [];

if (headers.join("|") !== requiredColumns.join("|")) {
  failures.push(`CSV 열이 예상과 다릅니다: ${headers.join(", ")}`);
}

const registry = csvRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
const catalog = readCatalog();
const paymentSlots = readPaymentSlots();
const registryBySku = new Map(registry.map((item) => [item.sku, item]));
const catalogBySku = new Map(catalog.map((item) => [item.sku, item]));

if (registry.length !== 16) failures.push(`등록표 상품 수는 16개여야 합니다: ${registry.length}`);
if (registryBySku.size !== registry.length) failures.push("등록표에 중복 SKU가 있습니다.");
if (Object.keys(paymentSlots).length !== 16) failures.push(`결제 링크 슬롯은 16개여야 합니다: ${Object.keys(paymentSlots).length}`);

registry.forEach((item, index) => {
  const product = catalogBySku.get(item.sku);
  if (!product) {
    failures.push(`${item.sku}: catalog.js에 없는 SKU입니다.`);
    return;
  }
  if (Number(item.display_order) !== index + 1) failures.push(`${item.sku}: 등록 순서가 연속적이지 않습니다.`);
  if (item.product_name !== product.name) failures.push(`${item.sku}: 상품명이 catalog.js와 다릅니다.`);
  if (item.catalog_type !== product.type) failures.push(`${item.sku}: 상품 유형이 catalog.js와 다릅니다.`);
  if (Number(item.price_krw) !== product.amount) failures.push(`${item.sku}: 가격이 catalog.js와 다릅니다.`);
  if (!(item.sku in paymentSlots)) failures.push(`${item.sku}: payment-links.js에 슬롯이 없습니다.`);

  const recurring = Boolean(product.interval);
  const expectedSetup = recurring ? "subscription_plan" : "payment_link";
  const expectedInterval = product.interval || "one_time";
  if (item.paypal_setup_type !== expectedSetup) failures.push(`${item.sku}: PayPal 등록 유형이 ${expectedSetup}이어야 합니다.`);
  if (item.billing_interval !== expectedInterval) failures.push(`${item.sku}: 청구 주기가 ${expectedInterval}이어야 합니다.`);

  const expectedShipping = product.type === "physical_book" ? "yes" : "no";
  if (item.shipping_required !== expectedShipping) failures.push(`${item.sku}: 배송지 설정이 ${expectedShipping}이어야 합니다.`);
  if (item.catalog_status !== (product.status || "ready")) failures.push(`${item.sku}: 판매 상태가 catalog.js와 다릅니다.`);
  if (item.paypal_url) {
    try {
      const url = new URL(item.paypal_url);
      const isPayPalHost = url.hostname === "paypal.com" || url.hostname.endsWith(".paypal.com") || url.hostname === "paypal.me";
      if (url.protocol !== "https:" || !isPayPalHost) failures.push(`${item.sku}: PayPal 공식 HTTPS URL이어야 합니다.`);
    } catch {
      failures.push(`${item.sku}: PayPal URL 형식이 올바르지 않습니다.`);
    }
  }
  if (item.paypal_url !== paymentSlots[item.sku]) failures.push(`${item.sku}: CSV와 payment-links.js URL이 다릅니다.`);
});

catalog.forEach((product) => {
  if (!registryBySku.has(product.sku)) failures.push(`${product.sku}: 등록표에 없는 카탈로그 SKU입니다.`);
});

Object.keys(paymentSlots).forEach((sku) => {
  if (!catalogBySku.has(sku)) failures.push(`${sku}: 카탈로그에 없는 결제 링크 슬롯입니다.`);
});

if (failures.length) {
  console.error("PayPal 등록표 검증 실패:\n- " + failures.join("\n- "));
  process.exit(1);
}

const configured = registry.filter((item) => item.paypal_url).length;
console.log(`PayPal 등록표 검증 통과: ${registry.length}개 SKU · 링크 ${configured}개 등록 · ${registry.length - configured}개 대기`);
