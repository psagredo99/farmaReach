function switchSection(id, el) {
  document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  const section = document.getElementById('section-' + id);
  if (section) {
    section.classList.add('active');
    section.classList.add('fade-in');
  }
  if (el) el.classList.add('active');

  const title = pageTitles[id] || [id, ''];
  document.getElementById('page-title').innerHTML = title[0] + '<small>' + title[1] + '</small>';

  if (id === 'leads') renderLeadsTable();
  if (id === 'envio') updateCampaignSummary();
  if (id === 'template') renderSavedTemplates();
}

function selectSource(source) {
  activeSource = source;
  document.querySelectorAll('.source-card').forEach((c) => c.classList.remove('selected'));
  document.getElementById('src-' + source).classList.add('selected');
}

function toggleSearchType() {
  const value = document.getElementById('search-type').value;
  ['cp', 'ciudad', 'zona'].forEach((name) => {
    document.getElementById(name + '-group').style.display = value === name ? '' : 'none';
  });
}

function updateStats() {
  const total = leads.length;
  const sent = leads.filter((l) => l.status === 'sent').length;
  const withEmail = leads.filter((l) => l.email).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-emails').textContent = withEmail;
  document.getElementById('stat-sent').textContent = sent;
  document.getElementById('stat-rate').textContent = total > 0 ? Math.round((sent / total) * 100) + '%' : '-';
  document.getElementById('sb-total').textContent = total;
  document.getElementById('badge-count').textContent = total;
  if (sent > 0) {
    document.getElementById('sb-rate').textContent = Math.round((sent / total) * 100) + '%';
  }

  updateCampaignSummary();
}

function updateBadge() {
  document.getElementById('badge-count').textContent = leads.length;
}

function addActivityLog(type, msg) {
  const log = document.getElementById('activity-log');
  const line = document.createElement('div');
  line.className = 'log-line ' + type;
  const now = new Date().toLocaleTimeString();
  line.innerHTML = `<span class="ts">[${now}]</span> ${msg}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function showToast(type, msg) {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  const text = document.getElementById('toast-msg');

  toast.className = 'toast ' + type;
  icon.textContent = type === 'success' ? 'OK' : 'X';
  text.textContent = msg;
  toast.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
}
