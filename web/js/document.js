const id = new URLSearchParams(location.search).get('id');
let doc = null;
let extraction = null;
let poll = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!id) return location = 'documents.html';
  view.href = API + '/documents/' + id + '/file';
  process.onclick = () => start('/process', 'Processing started.');
  retry.onclick = () => start('/extraction/retry', 'Retry started.');
  request.onclick = requestDeletion;
  await load();
});

async function load() {
  try {
    doc = await api('/documents/' + id);
    renderDoc();
    await loadExtraction();
    if (['UPLOADED', 'TEXT_EXTRACTING', 'OCR_PROCESSING', 'CLASSIFYING', 'AI_EXTRACTING', 'VALIDATING'].includes(doc.processing_status)) {
      if (!poll) poll = setInterval(load, 2500);
    } else if (poll) {
      clearInterval(poll);
      poll = null;
    }
  } catch (e) {
    message.textContent = e.message;
  }
}

function renderDoc() {
  name.textContent = doc.original_filename;
  const failed = doc.processing_status === 'FAILED' && doc.processing_failure_reason ? `<p><b>Failure:</b> ${esc(doc.processing_failure_reason)}</p>` : '';
  detail.innerHTML = `
    <p><b>Document type:</b> ${esc(doc.document_type)}</p>
    <p><b>Processing status:</b> ${statusText(doc.processing_status)}</p>
    <p><b>AI provider:</b> ${esc(doc.ai_provider || 'disabled')} ${doc.ai_model ? '(' + esc(doc.ai_model) + ')' : ''}</p>
    <p><b>OCR used:</b> ${doc.ocr_used ? 'Yes' : 'No'}</p>
    <p><b>Candidates:</b> ${doc.extraction_count} · <b>Reviewed:</b> ${doc.review_count} · <b>Corrections:</b> ${doc.correction_count}</p>
    <p><b>Upload date:</b> ${new Date(doc.created_at).toLocaleString()}</p>
    <p><b>File size:</b> ${doc.file_size} bytes</p>
    <p><b>Integrity hash:</b> <code>${esc(doc.file_hash)}</code></p>
    ${failed}`;
  process.hidden = !['UPLOADED', 'READY'].includes(doc.processing_status);
  retry.hidden = doc.processing_status !== 'FAILED';
}

async function loadExtraction() {
  try {
    const x = await api('/documents/' + id + '/extraction');
    extraction = x;
    review.className = '';
    review.innerHTML = `
      <div class="review-head">
        <div><b>AI extracted document type:</b> ${esc(x.document_type)}</div>
        <div><b>Confidence:</b> ${pct(x.confidence)}</div>
        <div><b>Status:</b> ${esc(x.status)}</div>
      </div>
      ${renderGroups(x.entities)}`;
  } catch (e) {
    review.className = 'muted';
    review.textContent = doc && doc.processing_status === 'FAILED' ? 'Processing failed. The original document is still available.' : 'No extraction is available yet.';
  }
}

function renderGroups(entities) {
  if (!entities.length) return '<p class="muted">No candidate entities were extracted. You can still view the source document.</p>';
  const groups = {};
  for (const e of entities) (groups[e.type] ||= []).push(e);
  return Object.keys(groups).sort().map(type => `
    <section class="entity-group">
      <h3>${esc(label(type))}</h3>
      ${groups[type].map(renderEntity).join('')}
    </section>`).join('');
}

function renderEntity(e) {
  const reviewed = e.reviewed_entity ? `<p><b>Verified/corrected:</b> ${esc(summary(e.reviewed_entity))}</p>` : '';
  return `
    <article class="entity">
      <div class="entity-title"><b>${esc(e.name)}</b><span>${esc(e.review_status)}</span></div>
      <p><b>AI:</b> ${esc(summary(e.raw_entity || e))}</p>
      ${reviewed}
      <p><b>Confidence:</b> ${pct(e.confidence)}</p>
      <p><b>Source:</b> ${source(e.source)} <a href="${API}/documents/${id}/file" target="_blank">View Source</a></p>
      <p>
        <button onclick="acceptEntity('${e.id}')">Accept</button>
        <button onclick="editEntity('${e.id}')">Edit</button>
        <button class="danger" onclick="rejectEntity('${e.id}')">Reject</button>
      </p>
    </article>`;
}

async function start(path, ok) {
  try {
    await api('/documents/' + id + path, { method: 'POST' });
    message.style.color = '#176b87';
    message.textContent = ok;
    await load();
  } catch (e) {
    message.style.color = '';
    message.textContent = e.message;
  }
}

async function acceptEntity(entityId) {
  await reviewCall(entityId, 'accept', { method: 'POST' });
}

async function rejectEntity(entityId) {
  await reviewCall(entityId, 'reject', { method: 'POST' });
}

async function editEntity(entityId) {
  const current = findEntity(entityId);
  const value = prompt('Corrected value:', current?.value || current?.raw_entity?.value || '');
  if (value === null) return;
  const corrected = { ...(current?.raw_entity || {}), value, corrected_by_user: true };
  await reviewCall(entityId, '', { method: 'PATCH', body: JSON.stringify({ entity: corrected }) });
}

async function reviewCall(entityId, action, opts) {
  try {
    const suffix = action ? '/' + action : '';
    await api(`/documents/${id}/extraction/${entityId}${suffix}`, opts);
    message.style.color = '#176b87';
    message.textContent = 'Review saved.';
    await load();
  } catch (e) {
    message.style.color = '';
    message.textContent = e.message;
  }
}

function findEntity(entityId) {
  return extraction?.entities?.find(e => e.id === entityId);
}

async function requestDeletion() {
  const reason = prompt('Reason for deletion request (optional):') ?? null;
  if (reason === null) return;
  try {
    await api('/documents/' + id + '/deletion-request', { method: 'POST', body: JSON.stringify({ reason }) });
    message.style.color = '#176b87';
    message.textContent = 'Deletion request submitted for administrator review.';
    request.disabled = true;
  } catch (e) {
    message.textContent = e.message;
  }
}

function statusText(s) {
  return esc(String(s).replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
}

function pct(v) {
  return Math.round(Number(v || 0) * 100) + '%';
}

function label(v) {
  return String(v).replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function source(s) {
  if (!s) return 'Document';
  const page = s.page ? `Page ${s.page}` : 'Document';
  return `${esc(page)}${s.text_reference ? ' · ' + esc(s.text_reference) : ''}`;
}

function summary(e) {
  if (!e) return '';
  if (typeof e === 'string') return e;
  return [e.name, e.value, e.unit].filter(Boolean).join(' ') || JSON.stringify(e);
}
