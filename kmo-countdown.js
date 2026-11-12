/*!
 * KMO 1차 시험 D-day 카운트다운
 * 사용: data-kmo-countdown 속성이 있는 요소에 자동 렌더링
 *   data-kmo-countdown="full"  — 일·시간·분·초 + 남은 주차 안내
 *   data-kmo-countdown="badge" — "D-123" 한 줄 배지
 *
 * ▶ 공식 공지가 나오면 아래 KMO_EXAM 의 date 와 status 만 바꾸면 됩니다.
 *   status: "estimated" (예상, 공지 전) | "official" (대한수학회 공지 확정)
 *
 * 2027 예상일 근거: 1차 시험은 매년 5월 시행(kmo.or.kr 사업 안내)이며,
 *   2024-05-18(토), 2026-05-16(토)로 모두 5월 셋째 토요일에 열렸습니다.
 *   2027년 5월 셋째 토요일 = 2027-05-15.
 */
(() => {
  const KMO_EXAM = {
    name: "2027 KMO 1차 시험",
    date: "2027-05-15",            // YYYY-MM-DD (한국 시간 기준)
    status: "estimated",           // "estimated" | "official"
    courseWeeks: 12,               // 조합 집중 커리큘럼 주차
    noticeUrl: "https://www.kmo.or.kr/"
  };

  const target = new Date(`${KMO_EXAM.date}T00:00:00+09:00`);
  const estimated = KMO_EXAM.status !== "official";
  const [y, m, d] = KMO_EXAM.date.split("-").map(Number);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const dateLabel = `${y}년 ${m}월 ${d}일(${weekday})`;

  const style = document.createElement("style");
  style.textContent = `
.kmo-cd{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);border-radius:16px;padding:18px 18px 16px;color:#fff}
.kmo-cd__top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.kmo-cd__name{font-weight:800;font-size:15px}
.kmo-cd__flag{font-size:11.5px;font-weight:800;padding:3px 10px;border-radius:999px;background:#C9A227;color:#3a2e00}
.kmo-cd__flag.is-est{background:transparent;color:#F3D98E;border:1px dashed #F3D98E}
.kmo-cd__date{color:#C9D8E8;font-size:13px;margin-top:2px}
.kmo-cd__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
.kmo-cd__cell{background:rgba(0,0,0,.18);border-radius:12px;padding:10px 4px;text-align:center}
.kmo-cd__cell b{display:block;font-size:clamp(22px,4vw,30px);font-weight:800;color:#F3D98E;font-variant-numeric:tabular-nums;letter-spacing:-.5px;line-height:1.15}
.kmo-cd__cell span{font-size:11.5px;color:#AFC6DD}
.kmo-cd__plan{margin-top:12px;font-size:13px;color:#DCE7F2;line-height:1.55}
.kmo-cd__plan strong{color:#F3D98E}
.kmo-cd__note{margin-top:8px;font-size:11.5px;color:#9fb3c8;line-height:1.5}
.kmo-cd__note a{color:#C9D8E8;text-decoration:underline}
.kmo-cd-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:#0B2A4A;color:#F3D98E;font-size:12px;font-weight:900;font-variant-numeric:tabular-nums}
.kmo-cd-badge small{color:#C9D8E8;font-weight:700;font-size:11px}
`;
  document.head.appendChild(style);

  const pad = (n) => String(n).padStart(2, "0");
  const parts = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  };

  const renderFull = (el) => {
    el.innerHTML = `
<div class="kmo-cd" role="timer" aria-live="off">
  <div class="kmo-cd__top">
    <div><div class="kmo-cd__name">${KMO_EXAM.name}까지</div><div class="kmo-cd__date">${dateLabel}${estimated ? " 예상" : ""}</div></div>
    <span class="kmo-cd__flag${estimated ? " is-est" : ""}">${estimated ? "예상 일정 · 공지 전" : "공식 일정"}</span>
  </div>
  <div class="kmo-cd__grid">
    <div class="kmo-cd__cell"><b data-u="d">-</b><span>일</span></div>
    <div class="kmo-cd__cell"><b data-u="h">-</b><span>시간</span></div>
    <div class="kmo-cd__cell"><b data-u="m">-</b><span>분</span></div>
    <div class="kmo-cd__cell"><b data-u="s">-</b><span>초</span></div>
  </div>
  <p class="kmo-cd__plan" data-u="plan"></p>
  ${estimated ? `<p class="kmo-cd__note">최근 1차 시험이 5월 셋째 토요일(2024.5.18, 2026.5.16)에 열린 점을 근거로 한 예상일입니다. 확정 일정은 <a href="${KMO_EXAM.noticeUrl}" target="_blank" rel="noopener noreferrer">대한수학회 KMO 공지</a>를 확인해 주세요.</p>` : ""}
</div>`;
    const cells = {};
    el.querySelectorAll("[data-u]").forEach((n) => { cells[n.dataset.u] = n; });
    const tick = () => {
      const left = target - Date.now();
      if (left <= 0) {
        el.querySelector(".kmo-cd__grid").hidden = true;
        cells.plan.innerHTML = `${KMO_EXAM.name} 시행일이 지났습니다. 2차 대비 서술형 첨삭과 다음 시즌 상담을 받고 있습니다.`;
        return false;
      }
      const t = parts(left);
      cells.d.textContent = t.d; cells.h.textContent = pad(t.h); cells.m.textContent = pad(t.m); cells.s.textContent = pad(t.s);
      const weeks = Math.floor(t.d / 7);
      const spare = weeks - KMO_EXAM.courseWeeks;
      cells.plan.innerHTML = spare > 0
        ? `남은 기간 약 <strong>${weeks}주</strong> — 12주 조합 커리큘럼을 마치고도 <strong>${spare}주</strong>를 실전 모의와 서술형 첨삭에 쓸 수 있습니다.`
        : `남은 기간 약 <strong>${weeks}주</strong> — 지금은 약점 주제 위주의 단기 집중 편성을 권합니다.`;
      return true;
    };
    if (tick()) {
      const id = setInterval(() => { if (!tick()) clearInterval(id); }, 1000);
    }
  };

  const renderBadge = (el) => {
    const update = () => {
      const left = target - Date.now();
      const days = Math.ceil(left / 86400000);
      el.innerHTML = left > 0
        ? `<span class="kmo-cd-badge" title="${KMO_EXAM.name} ${dateLabel}${estimated ? " (예상)" : ""}">KMO 1차 D-${days}${estimated ? " <small>예상</small>" : ""}</span>`
        : "";
    };
    update();
    setInterval(update, 60000);
  };

  const boot = () => {
    document.querySelectorAll("[data-kmo-countdown]").forEach((el) => {
      (el.dataset.kmoCountdown === "badge" ? renderBadge : renderFull)(el);
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.STARGATE_KMO_EXAM = KMO_EXAM;
})();
