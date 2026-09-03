(() => {
  const mount = document.getElementById("legal-footer");
  if (!mount) return;

  const business = window.STARGATE_BUSINESS || {};
  const en = document.documentElement.lang.toLowerCase().startsWith("en");
  const labels = en ? {
    companyName: "Company", representative: "Representative",
    businessNumber: "Business registration", mailOrderNumber: "E-commerce registration",
    address: "Address", phone: "Phone", email: "Email",
    privacyOfficer: "Privacy officer", hostingProvider: "Hosting"
  } : {
    companyName: "상호", representative: "대표자",
    businessNumber: "사업자등록번호", mailOrderNumber: "통신판매업신고번호",
    address: "사업장 주소", phone: "전화", email: "이메일",
    privacyOfficer: "개인정보 보호책임자", hostingProvider: "호스팅 제공자"
  };
  const keys = ["companyName", "representative", "businessNumber", "mailOrderNumber", "address", "phone", "email", "privacyOfficer", "hostingProvider"];
  const info = document.createElement("div");
  info.className = "legal-footer__info";
  keys.filter((key) => typeof business[key] === "string" && business[key].trim()).forEach((key) => {
    const span = document.createElement("span");
    span.textContent = `${labels[key]} ${business[key].trim()}`;
    info.appendChild(span);
  });

  const links = document.createElement("div");
  links.className = "legal-footer__links";
  const policies = en
    ? [["/terms.html", "Terms"], ["/privacy.html", "Privacy"], ["https://stargateedu.co.kr/refund/", "Refund policy"]]
    : [["/terms.html", "이용약관"], ["/privacy.html", "개인정보처리방침"], ["https://stargateedu.co.kr/refund/", "환불정책"]];
  policies.forEach(([href, text]) => {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = text;
    if (href.startsWith("https://")) link.rel = "noopener";
    links.appendChild(link);
  });

  const style = document.createElement("style");
  style.textContent = ".legal-footer{max-width:900px;margin:30px auto;padding:20px;color:#667085;font-size:12px;line-height:1.8;text-align:center}.legal-footer__info{display:flex;justify-content:center;gap:3px 16px;flex-wrap:wrap}.legal-footer__links{display:flex;justify-content:center;gap:16px;margin-top:8px}.legal-footer a{color:#0B2A4A;font-weight:700}";
  mount.classList.add("legal-footer");
  mount.append(style, info, links);
})();
