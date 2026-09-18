let pts = [];
document.addEventListener('DOMContentLoaded', async () => {
  try {
    pts = (await api('/patients')).patients;
    render();
    patients.onchange = select;
    document.querySelector('#patient-form').onsubmit = create;
    logout.onclick = async e => {
      e.preventDefault();
      await api('/auth/logout', { method: 'POST' });
      sessionStorage.clear();
      location = 'login.html';
    };
  } catch (e) {
    location = 'login.html';
  }
});

function render() {
  patients.innerHTML = '<option value="">Select patient</option>' + pts.map(p => `<option value="${p.id}">${esc(p.display_name)}</option>`).join('');
  if (sessionStorage.patient && pts.some(p => p.id === sessionStorage.patient)) {
    patients.value = sessionStorage.patient;
    select();
  }
}

async function create(e) {
  e.preventDefault();
  try {
    const p = await api('/patients', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    pts.unshift(p);
    sessionStorage.patient = p.id;
    render();
    location = 'documents.html';
  } catch (x) {
    message.textContent = x.message;
  }
}

async function select() {
  if (!patients.value) return;
  sessionStorage.patient = patients.value;
  try {
    const d = await api(`/patients/${patients.value}/overview`);
    docCount.textContent = d.documents;
    verifiedCount.textContent = d.verified_records;
    eventCount.textContent = d.timeline_events;
    recent.className = '';
    recent.innerHTML = d.recent_events.length ? d.recent_events.map(eventRow).join('') : '<p class="muted">No verified timeline events yet.</p>';
  } catch (e) {
    message.textContent = e.message;
  }
}

function eventRow(e) {
  return `<article class="mini-event"><a href="timeline.html?event=${e.id}">${esc(e.title)}</a><div class="muted">${esc(displayDate(e))} · ${esc(e.event_type)}</div></article>`;
}

function displayDate(e) {
  return e.event_date || 'Date unknown';
}
