document.addEventListener('DOMContentLoaded', load);

async function load() {
  try {
    message.textContent = 'Loading system analytics...';
    const [ov, proc, rev, docs] = await Promise.all([
      api('/admin/analytics/overview'),
      api('/admin/analytics/processing'),
      api('/admin/analytics/review'),
      api('/admin/analytics/documents')
    ]);
    message.textContent = '';
    overview.innerHTML = Object.entries(ov.overview).map(([k, v]) => metric(k.replaceAll('_', ' '), v)).join('');
    processing.innerHTML = objectList(proc.processing);
    review.innerHTML = objectList({ total_candidates: rev.review.total_candidates, average_extraction_confidence: pct(rev.review.average_extraction_confidence) }) + bars(rev.review.by_status, 'No extracted candidates yet.');
    documents.innerHTML = objectList({ total: docs.documents.total, soft_deleted: docs.documents.soft_deleted, failed_processing: docs.documents.failed_processing, duplicate_uploads: docs.documents.duplicate_uploads }) + bars(docs.documents.by_status, '');
    health.innerHTML = objectList(ov.health);
  } catch (e) {
    message.textContent = e.message;
  }
}

function metric(label, value) {
  return `<div class="card"><div class="muted">${esc(label)}</div><div class="metric">${esc(value)}</div></div>`;
}

function objectList(o) {
  return `<dl class="kv">${Object.entries(o).map(([k, v]) => `<div><dt>${esc(k.replaceAll('_', ' '))}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function bars(items, empty) {
  if (!items || !items.length) return empty ? `<p class="muted">${esc(empty)}</p>` : '';
  const max = Math.max(...items.map(x => x.count), 1);
  return `<div class="bars">${items.map(x => `<div class="bar-row"><span>${esc(x.key)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, x.count / max * 100)}%"></div></div><b>${esc(x.count)}</b></div>`).join('')}</div>`;
}

function pct(v) {
  return Math.round(Number(v || 0) * 100) + '%';
}
