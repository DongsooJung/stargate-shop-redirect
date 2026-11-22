(() => {
  'use strict';
  if (location.hostname !== 'shop.stargateedu.co.kr' || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  const endpoint = 'https://inftexpcnfinglwlrvsj.supabase.co/rest/v1/rpc/record_site_usage_event';
  const key = 'sb_publishable_-D0A-aWNMTMTHXeL0oqBXg_9Tz0bdvs';
  const fallback = {};
  function identifier(storageName) {
    const name = 'shop:metrics:' + storageName;
    try {
      const storage = window[storageName];
      let id = storage.getItem(name);
      if (!id) {
        id = crypto.randomUUID();
        storage.setItem(name, id);
      }
      return id;
    } catch {
      return fallback[name] ||= crypto.randomUUID();
    }
  }
  const params = new URLSearchParams(location.search);
  const channel = (() => {
    const known = ['homepage','blog','tistory','naver','wordpress','instagram','kakao','stargatelearn'];
    try {
      const tag = params.get('utm_source')?.toLowerCase();
      const host = document.referrer && new URL(document.referrer).hostname;
      const source = known.includes(tag) ? tag : !host ? null :
        host === location.hostname ? null : /^(www\.)?stargateedu\.co\.kr$/.test(host) ? 'homepage' :
        host.endsWith('.tistory.com') ? 'tistory' : 'referral';
      if (source) sessionStorage.setItem('shop:metrics:source', source);
      return source || sessionStorage.getItem('shop:metrics:source') || 'direct';
    } catch { return 'unknown'; }
  })();
  function record(type, path, label, id = crypto.randomUUID()) {
    const payload = {
      p_event_id:id, p_visitor_id:identifier('localStorage'), p_session_id:identifier('sessionStorage'),
      p_event_type:type, p_page_path:'/shop/' + path, p_page_title:'STARGATE shop',
      p_element_label:label, p_element_kind:type === 'click' ? 'shop_event' : null,
      p_target_url:null, p_device_type:null
    };
    fetch(endpoint, {method:'POST', credentials:'omit', referrerPolicy:'no-referrer', keepalive:true,
      headers:{apikey:key, Authorization:'Bearer ' + key, 'Content-Type':'application/json'},
      body:JSON.stringify(payload)}).catch(() => {});
  }
  const page = location.pathname.replace(/^\//,'') || 'index.html';
  const sku = params.get('sku');
  const product = sku && Object.values(window.STARGATE_CATALOG?.products || {}).some(item => item.sku === sku) ? sku : null;
  const path = product && page === 'checkout.html' ? 'product/' + product : page;
  record('page_view', path, null);
  if (product && page === 'checkout.html') record('click', path, 'product_view:' + channel);
  window.shopMetric = async (stage, order) => {
    try {
      if (!product) return;
      if (stage === 'begin_checkout') return record('click','product/' + product,stage + ':' + channel);
      if (stage !== 'purchase' || !order) return;
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('shop/purchase/' + order));
      const hex = Array.from(new Uint8Array(hash).slice(0,16), n => n.toString(16).padStart(2,'0')).join('');
      const id = [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
      record('click','product/' + product,'purchase:' + channel,id);
    } catch { /* Analytics must not interrupt checkout. */ }
  };
  for (const args of window.shopMetricsPending || []) window.shopMetric(...args);
})();
