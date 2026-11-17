/* ========================================
   EstudoFlow — JavaScript
   ======================================== */

// ---------- Estado & Storage ----------
const STORAGE_KEY = 'estudoflow_data';

let state = {
  tarefas: [],
  metas: [],
  materias: [],
  dataDiario: null,      // Date object
  mesAtual: null,        // Date object (primeiro dia do mês)
  diaSelecionadoMes: null
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.tarefas = data.tarefas || [];
      state.metas = data.metas || [];
      state.materias = data.materias || [];
    }
  } catch (e) {
    console.warn('Erro ao carregar dados:', e);
  }

  // Datas padrão
  const hoje = new Date();
  state.dataDiario = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  state.mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  state.diaSelecionadoMes = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    tarefas: state.tarefas,
    metas: state.metas,
    materias: state.materias
  }));
}

// ---------- Helpers ----------
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateBR(d) {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatMonthYear(d) {
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function getPriorityLabel(p) {
  return { baixa: 'Baixa', media: 'Média', alta: 'Alta' }[p] || p;
}

function getMateriaById(id) {
  return state.materias.find(m => m.id === id);
}

// ---------- Navegação ----------
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
    });
  });

  // Menu mobile
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Fechar sidebar ao clicar em item (mobile)
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
      }
    });
  });
}

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const view = document.getElementById(`view-${viewName}`);
  const nav = document.querySelector(`.nav-item[data-view="${viewName}"]`);

  if (view) view.classList.add('active');
  if (nav) nav.classList.add('active');

  const titles = {
    dashboard: 'Início',
    diario: 'Planejamento Diário',
    mensal: 'Calendário Mensal',
    anual: 'Metas Anuais',
    materias: 'Matérias'
  };
  document.getElementById('view-title').textContent = titles[viewName] || '';

  // Render específico
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'diario') renderDiario();
  if (viewName === 'mensal') renderMensal();
  if (viewName === 'anual') renderAnual();
  if (viewName === 'materias') renderMaterias();
}

// ---------- Render: Dashboard ----------
function renderDashboard() {
  const hoje = new Date();
  const hojeStr = formatDateISO(hoje);

  // Saudação
  const hora = hoje.getHours();
  let saudacao = 'Olá';
  if (hora < 12) saudacao = 'Bom dia';
  else if (hora < 18) saudacao = 'Boa tarde';
  else saudacao = 'Boa noite';
  document.getElementById('saudacao').textContent = `${saudacao}!`;
  document.getElementById('data-hoje').textContent = formatDateBR(hoje);

  // Stats
  const tarefasHoje = state.tarefas.filter(t => t.data === hojeStr);
  const concluidas = tarefasHoje.filter(t => t.concluida).length;
  const pendentes = tarefasHoje.length - concluidas;

  document.getElementById('stat-hoje').textContent = tarefasHoje.length;
  document.getElementById('stat-concluidas').textContent = concluidas;
  document.getElementById('stat-pendentes').textContent = pendentes;

  // Progresso sidebar
  const pct = tarefasHoje.length ? Math.round((concluidas / tarefasHoje.length) * 100) : 0;
  document.getElementById('sidebar-progress').style.width = pct + '%';
  document.getElementById('sidebar-progress-text').textContent = pct + '%';

  // Lista de hoje
  const lista = document.getElementById('lista-hoje');
  const empty = document.getElementById('empty-hoje');
  lista.innerHTML = '';

  if (tarefasHoje.length === 0) {
    empty.classList.add('visible');
  } else {
    empty.classList.remove('visible');
    tarefasHoje
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
      .forEach(t => lista.appendChild(createTaskElement(t, true)));
  }

  // Metas próximas
  const listaMetas = document.getElementById('lista-metas-proximas');
  const emptyMetas = document.getElementById('empty-metas');
  listaMetas.innerHTML = '';

  const metasAtivas = state.metas
    .filter(m => (m.progresso || 0) < 100)
    .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'))
    .slice(0, 4);

  if (metasAtivas.length === 0) {
    emptyMetas.classList.add('visible');
  } else {
    emptyMetas.classList.remove('visible');
    metasAtivas.forEach(m => {
      const div = document.createElement('div');
      div.className = 'goal-mini';
      div.innerHTML = `
        <div class="goal-mini-title">${escapeHtml(m.titulo)}</div>
        <div class="goal-mini-bar">
          <div class="goal-mini-fill" style="width:${m.progresso || 0}%"></div>
        </div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${m.progresso || 0}%</div>
      `;
      listaMetas.appendChild(div);
    });
  }

  // Matérias chips
  const chips = document.getElementById('lista-materias-dash');
  chips.innerHTML = '';
  if (state.materias.length === 0) {
    chips.innerHTML = '<span style="color:var(--text-muted);font-size:0.9rem">Nenhuma matéria cadastrada</span>';
  } else {
    state.materias.forEach(m => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `
        <span class="chip-dot" style="background:${m.cor}"></span>
        ${escapeHtml(m.nome)}
      `;
      chips.appendChild(chip);
    });
  }
}

// ---------- Render: Diário ----------
function renderDiario() {
  const input = document.getElementById('input-data-diario');
  input.value = formatDateISO(state.dataDiario);

  // Filtros de matéria
  const selMateria = document.getElementById('filtro-materia-diario');
  const currentVal = selMateria.value;
  selMateria.innerHTML = '<option value="">Todas as matérias</option>';
  state.materias.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nome;
    selMateria.appendChild(opt);
  });
  selMateria.value = currentVal;

  applyDiarioFilters();
}

function applyDiarioFilters() {
  const dataStr = formatDateISO(state.dataDiario);
  const filtroMateria = document.getElementById('filtro-materia-diario').value;
  const filtroStatus = document.getElementById('filtro-status-diario').value;

  let tarefas = state.tarefas.filter(t => t.data === dataStr);

  if (filtroMateria) {
    tarefas = tarefas.filter(t => t.materiaId === filtroMateria);
  }
  if (filtroStatus === 'pendente') {
    tarefas = tarefas.filter(t => !t.concluida);
  } else if (filtroStatus === 'concluida') {
    tarefas = tarefas.filter(t => t.concluida);
  }

  tarefas.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

  const lista = document.getElementById('lista-diario');
  const empty = document.getElementById('empty-diario');
  lista.innerHTML = '';

  if (tarefas.length === 0) {
    empty.classList.add('visible');
  } else {
    empty.classList.remove('visible');
    tarefas.forEach(t => lista.appendChild(createTaskElement(t)));
  }
}

function initDiarioControls() {
  document.getElementById('btn-dia-anterior').addEventListener('click', () => {
    state.dataDiario.setDate(state.dataDiario.getDate() - 1);
    renderDiario();
  });
  document.getElementById('btn-dia-proximo').addEventListener('click', () => {
    state.dataDiario.setDate(state.dataDiario.getDate() + 1);
    renderDiario();
  });
  document.getElementById('btn-hoje').addEventListener('click', () => {
    const hoje = new Date();
    state.dataDiario = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    renderDiario();
  });
  document.getElementById('input-data-diario').addEventListener('change', (e) => {
    state.dataDiario = parseDate(e.target.value);
    renderDiario();
  });
  document.getElementById('filtro-materia-diario').addEventListener('change', applyDiarioFilters);
  document.getElementById('filtro-status-diario').addEventListener('change', applyDiarioFilters);
}

// ---------- Render: Mensal ----------
function renderMensal() {
  const titulo = document.getElementById('titulo-mes');
  titulo.textContent = formatMonthYear(state.mesAtual);

  const year = state.mesAtual.getFullYear();
  const month = state.mesAtual.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay(); // 0 = domingo
  const totalDays = lastDay.getDate();

  const grid = document.getElementById('calendario');
  grid.innerHTML = '';

  // Dias vazios do início
  for (let i = 0; i < startWeekday; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  // Dias do mês
  const hoje = new Date();
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDateISO(date);
    const hasTasks = state.tarefas.some(t => t.data === dateStr);

    const el = document.createElement('div');
    el.className = 'cal-day';
    el.textContent = day;

    if (isSameDay(date, hoje)) el.classList.add('today');
    if (state.diaSelecionadoMes && isSameDay(date, state.diaSelecionadoMes)) {
      el.classList.add('selected');
    }
    if (hasTasks) el.classList.add('has-tasks');

    el.addEventListener('click', () => {
      state.diaSelecionadoMes = date;
      renderMensal();
      renderTarefasDiaSelecionado();
    });

    grid.appendChild(el);
  }

  renderTarefasDiaSelecionado();
}

function renderTarefasDiaSelecionado() {
  const lista = document.getElementById('lista-mes-selecionado');
  const empty = document.getElementById('empty-mes');
  lista.innerHTML = '';

  if (!state.diaSelecionadoMes) {
    empty.classList.add('visible');
    empty.textContent = 'Selecione um dia no calendário.';
    return;
  }

  const dataStr = formatDateISO(state.diaSelecionadoMes);
  const tarefas = state.tarefas
    .filter(t => t.data === dataStr)
    .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

  if (tarefas.length === 0) {
    empty.classList.add('visible');
    empty.textContent = 'Nenhuma tarefa neste dia.';
  } else {
    empty.classList.remove('visible');
    tarefas.forEach(t => lista.appendChild(createTaskElement(t)));
  }
}

function initMensalControls() {
  document.getElementById('btn-mes-anterior').addEventListener('click', () => {
    state.mesAtual.setMonth(state.mesAtual.getMonth() - 1);
    renderMensal();
  });
  document.getElementById('btn-mes-proximo').addEventListener('click', () => {
    state.mesAtual.setMonth(state.mesAtual.getMonth() + 1);
    renderMensal();
  });
}

// ---------- Render: Anual (Metas) ----------
function renderAnual() {
  document.getElementById('ano-atual').textContent = new Date().getFullYear();

  const grid = document.getElementById('lista-metas');
  const empty = document.getElementById('empty-anual');
  grid.innerHTML = '';

  if (state.metas.length === 0) {
    empty.classList.add('visible');
    return;
  }
  empty.classList.remove('visible');

  state.metas
    .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'))
    .forEach(m => {
      const card = document.createElement('div');
      card.className = 'goal-card';

      const materia = getMateriaById(m.materiaId);
      const materiaNome = materia ? materia.nome : '';

      card.innerHTML = `
        <div class="goal-header">
          <div class="goal-title">${escapeHtml(m.titulo)}</div>
          <div class="goal-actions">
            <button class="btn btn-sm btn-ghost" data-edit-meta="${m.id}" title="Editar">✏️</button>
            <button class="btn btn-sm btn-danger" data-delete-meta="${m.id}" title="Excluir">🗑️</button>
          </div>
        </div>
        ${m.descricao ? `<div class="goal-desc">${escapeHtml(m.descricao)}</div>` : ''}
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="width:${m.progresso || 0}%"></div>
        </div>
        <div class="goal-footer">
          <span>${m.progresso || 0}% concluído</span>
          <span>${m.prazo ? 'Prazo: ' + parseDate(m.prazo).toLocaleDateString('pt-BR') : ''}</span>
        </div>
        ${materiaNome ? `<div style="margin-top:0.5rem"><span class="task-badge badge-materia">${escapeHtml(materiaNome)}</span></div>` : ''}
      `;
      grid.appendChild(card);
    });

  // Eventos de edição/exclusão
  grid.querySelectorAll('[data-edit-meta]').forEach(btn => {
    btn.addEventListener('click', () => openMetaModal(btn.dataset.editMeta));
  });
  grid.querySelectorAll('[data-delete-meta]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Excluir esta meta?')) {
        state.metas = state.metas.filter(m => m.id !== btn.dataset.deleteMeta);
        saveState();
        renderAnual();
        renderDashboard();
      }
    });
  });
}

// ---------- Render: Matérias ----------
function renderMaterias() {
  const grid = document.getElementById('lista-materias');
  const empty = document.getElementById('empty-materias');
  grid.innerHTML = '';

  if (state.materias.length === 0) {
    empty.classList.add('visible');
    return;
  }
  empty.classList.remove('visible');

  state.materias.forEach(m => {
    const count = state.tarefas.filter(t => t.materiaId === m.id).length;
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = `
      <div class="subject-name">
        <span class="subject-color" style="background:${m.cor}"></span>
        ${escapeHtml(m.nome)}
      </div>
      <div class="subject-meta">
        ${m.metaHoras ? `Meta: ${m.metaHoras}h/semana · ` : ''}
        ${count} tarefa${count !== 1 ? 's' : ''}
      </div>
      <div class="subject-actions">
        <button class="btn btn-sm btn-ghost" data-edit-materia="${m.id}">Editar</button>
        <button class="btn btn-sm btn-danger" data-delete-materia="${m.id}">Excluir</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('[data-edit-materia]').forEach(btn => {
    btn.addEventListener('click', () => openMateriaModal(btn.dataset.editMateria));
  });
  grid.querySelectorAll('[data-delete-materia]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Excluir esta matéria? As tarefas vinculadas ficarão sem matéria.')) {
        state.materias = state.materias.filter(m => m.id !== btn.dataset.deleteMateria);
        // Limpar referência nas tarefas
        state.tarefas.forEach(t => {
          if (t.materiaId === btn.dataset.deleteMateria) t.materiaId = '';
        });
        saveState();
        renderMaterias();
        renderDashboard();
        populateMateriaSelects();
      }
    });
  });
}

// ---------- Criar elemento de tarefa ----------
function createTaskElement(tarefa, compact = false) {
  const el = document.createElement('div');
  el.className = 'task-item' + (tarefa.concluida ? ' concluida' : '');

  const materia = getMateriaById(tarefa.materiaId);
  const materiaNome = materia ? materia.nome : '';

  el.innerHTML = `
    <input type="checkbox" class="task-check" ${tarefa.concluida ? 'checked' : ''} data-toggle="${tarefa.id}" />
    <div class="task-content">
      <div class="task-title">${escapeHtml(tarefa.titulo)}</div>
      <div class="task-meta">
        ${tarefa.hora ? `<span>🕒 ${tarefa.hora}</span>` : ''}
        ${tarefa.duracao ? `<span>⏱️ ${tarefa.duracao} min</span>` : ''}
        ${materiaNome ? `<span class="task-badge badge-materia">${escapeHtml(materiaNome)}</span>` : ''}
        <span class="task-badge badge-prioridade-${tarefa.prioridade}">${getPriorityLabel(tarefa.prioridade)}</span>
      </div>
      ${!compact && tarefa.notas ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">${escapeHtml(tarefa.notas)}</div>` : ''}
    </div>
    <div class="task-actions">
      <button data-edit-tarefa="${tarefa.id}" title="Editar">✏️</button>
      <button data-delete-tarefa="${tarefa.id}" title="Excluir">🗑️</button>
    </div>
  `;

  // Toggle concluída
  el.querySelector('[data-toggle]').addEventListener('change', (e) => {
    const t = state.tarefas.find(x => x.id === tarefa.id);
    if (t) {
      t.concluida = e.target.checked;
      saveState();
      // Re-render views relevantes
      const activeView = document.querySelector('.view.active')?.id;
      if (activeView === 'view-dashboard') renderDashboard();
      else if (activeView === 'view-diario') applyDiarioFilters();
      else if (activeView === 'view-mensal') {
        renderMensal();
        renderTarefasDiaSelecionado();
      }
      // Atualizar progresso sidebar sempre
      updateSidebarProgress();
    }
  });

  el.querySelector('[data-edit-tarefa]')?.addEventListener('click', () => openTarefaModal(tarefa.id));
  el.querySelector('[data-delete-tarefa]')?.addEventListener('click', () => {
    if (confirm('Excluir esta tarefa?')) {
      state.tarefas = state.tarefas.filter(t => t.id !== tarefa.id);
      saveState();
      const activeView = document.querySelector('.view.active')?.id;
      if (activeView === 'view-dashboard') renderDashboard();
      else if (activeView === 'view-diario') applyDiarioFilters();
      else if (activeView === 'view-mensal') {
        renderMensal();
        renderTarefasDiaSelecionado();
      }
      updateSidebarProgress();
    }
  });

  return el;
}

function updateSidebarProgress() {
  const hojeStr = formatDateISO(new Date());
  const tarefasHoje = state.tarefas.filter(t => t.data === hojeStr);
  const concluidas = tarefasHoje.filter(t => t.concluida).length;
  const pct = tarefasHoje.length ? Math.round((concluidas / tarefasHoje.length) * 100) : 0;
  document.getElementById('sidebar-progress').style.width = pct + '%';
  document.getElementById('sidebar-progress-text').textContent = pct + '%';
}

// ---------- Modais ----------
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function initModals() {
  // Fechar ao clicar no X ou Cancelar
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // Fechar ao clicar fora
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Botões de abrir
  document.getElementById('btn-nova-tarefa').addEventListener('click', () => openTarefaModal());
  document.getElementById('btn-nova-meta').addEventListener('click', () => openMetaModal());
  document.getElementById('btn-nova-materia').addEventListener('click', () => openMateriaModal());

  // Forms
  document.getElementById('form-tarefa').addEventListener('submit', handleSaveTarefa);
  document.getElementById('form-meta').addEventListener('submit', handleSaveMeta);
  document.getElementById('form-materia').addEventListener('submit', handleSaveMateria);
}

function populateMateriaSelects() {
  const selects = [
    document.getElementById('tarefa-materia'),
    document.getElementById('meta-materia')
  ];
  selects.forEach(sel => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— Nenhuma —</option>';
    state.materias.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.nome;
      sel.appendChild(opt);
    });
    sel.value = current;
  });
}

// --- Tarefa ---
function openTarefaModal(id = null) {
  const form = document.getElementById('form-tarefa');
  form.reset();
  document.getElementById('tarefa-id').value = '';

  populateMateriaSelects();

  if (id) {
    const t = state.tarefas.find(x => x.id === id);
    if (t) {
      document.getElementById('modal-tarefa-titulo').textContent = 'Editar Tarefa';
      document.getElementById('tarefa-id').value = t.id;
      document.getElementById('tarefa-titulo').value = t.titulo;
      document.getElementById('tarefa-data').value = t.data;
      document.getElementById('tarefa-hora').value = t.hora || '';
      document.getElementById('tarefa-materia').value = t.materiaId || '';
      document.getElementById('tarefa-prioridade').value = t.prioridade || 'media';
      document.getElementById('tarefa-duracao').value = t.duracao || '';
      document.getElementById('tarefa-notas').value = t.notas || '';
    }
  } else {
    document.getElementById('modal-tarefa-titulo').textContent = 'Nova Tarefa';
    // Data padrão = data do diário ou hoje
    const dataPadrao = state.dataDiario || new Date();
    document.getElementById('tarefa-data').value = formatDateISO(dataPadrao);
  }

  openModal('modal-tarefa');
}

function handleSaveTarefa(e) {
  e.preventDefault();
  const id = document.getElementById('tarefa-id').value;
  const data = {
    titulo: document.getElementById('tarefa-titulo').value.trim(),
    data: document.getElementById('tarefa-data').value,
    hora: document.getElementById('tarefa-hora').value,
    materiaId: document.getElementById('tarefa-materia').value,
    prioridade: document.getElementById('tarefa-prioridade').value,
    duracao: document.getElementById('tarefa-duracao').value ? Number(document.getElementById('tarefa-duracao').value) : null,
    notas: document.getElementById('tarefa-notas').value.trim(),
    concluida: false
  };

  if (!data.titulo || !data.data) return;

  if (id) {
    const idx = state.tarefas.findIndex(t => t.id === id);
    if (idx !== -1) {
      data.concluida = state.tarefas[idx].concluida;
      state.tarefas[idx] = { ...state.tarefas[idx], ...data };
    }
  } else {
    data.id = uid();
    state.tarefas.push(data);
  }

  saveState();
  closeModal('modal-tarefa');

  // Atualizar views
  renderDashboard();
  if (document.getElementById('view-diario').classList.contains('active')) renderDiario();
  if (document.getElementById('view-mensal').classList.contains('active')) renderMensal();
  updateSidebarProgress();
}

// --- Meta ---
function openMetaModal(id = null) {
  const form = document.getElementById('form-meta');
  form.reset();
  document.getElementById('meta-id').value = '';
  document.getElementById('meta-progresso').value = 0;

  populateMateriaSelects();

  if (id) {
    const m = state.metas.find(x => x.id === id);
    if (m) {
      document.getElementById('modal-meta-titulo').textContent = 'Editar Meta';
      document.getElementById('meta-id').value = m.id;
      document.getElementById('meta-titulo').value = m.titulo;
      document.getElementById('meta-descricao').value = m.descricao || '';
      document.getElementById('meta-prazo').value = m.prazo || '';
      document.getElementById('meta-progresso').value = m.progresso || 0;
      document.getElementById('meta-materia').value = m.materiaId || '';
    }
  } else {
    document.getElementById('modal-meta-titulo').textContent = 'Nova Meta Anual';
  }

  openModal('modal-meta');
}

function handleSaveMeta(e) {
  e.preventDefault();
  const id = document.getElementById('meta-id').value;
  const data = {
    titulo: document.getElementById('meta-titulo').value.trim(),
    descricao: document.getElementById('meta-descricao').value.trim(),
    prazo: document.getElementById('meta-prazo').value,
    progresso: Number(document.getElementById('meta-progresso').value) || 0,
    materiaId: document.getElementById('meta-materia').value
  };

  if (!data.titulo) return;

  if (id) {
    const idx = state.metas.findIndex(m => m.id === id);
    if (idx !== -1) {
      state.metas[idx] = { ...state.metas[idx], ...data };
    }
  } else {
    data.id = uid();
    state.metas.push(data);
  }

  saveState();
  closeModal('modal-meta');
  renderAnual();
  renderDashboard();
}

// --- Matéria ---
function openMateriaModal(id = null) {
  const form = document.getElementById('form-materia');
  form.reset();
  document.getElementById('materia-id').value = '';
  document.getElementById('materia-cor').value = '#3b82f6';

  if (id) {
    const m = state.materias.find(x => x.id === id);
    if (m) {
      document.getElementById('modal-materia-titulo').textContent = 'Editar Matéria';
      document.getElementById('materia-id').value = m.id;
      document.getElementById('materia-nome').value = m.nome;
      document.getElementById('materia-cor').value = m.cor || '#3b82f6';
      document.getElementById('materia-meta-horas').value = m.metaHoras || '';
    }
  } else {
    document.getElementById('modal-materia-titulo').textContent = 'Nova Matéria';
  }

  openModal('modal-materia');
}

function handleSaveMateria(e) {
  e.preventDefault();
  const id = document.getElementById('materia-id').value;
  const data = {
    nome: document.getElementById('materia-nome').value.trim(),
    cor: document.getElementById('materia-cor').value,
    metaHoras: document.getElementById('materia-meta-horas').value
      ? Number(document.getElementById('materia-meta-horas').value)
      : null
  };

  if (!data.nome) return;

  if (id) {
    const idx = state.materias.findIndex(m => m.id === id);
    if (idx !== -1) {
      state.materias[idx] = { ...state.materias[idx], ...data };
    }
  } else {
    data.id = uid();
    state.materias.push(data);
  }

  saveState();
  closeModal('modal-materia');
  renderMaterias();
  renderDashboard();
  populateMateriaSelects();
}

// ---------- Util ----------
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- Seed inicial (opcional) ----------
function seedIfEmpty() {
  if (state.materias.length === 0 && state.tarefas.length === 0) {
    // Matérias de exemplo
    const fisica = { id: uid(), nome: 'Física', cor: '#3b82f6', metaHoras: 5 };
    const matematica = { id: uid(), nome: 'Matemática', cor: '#10b981', metaHoras: 4 };
    const portugues = { id: uid(), nome: 'Português', cor: '#f59e0b', metaHoras: 3 };
    state.materias.push(fisica, matematica, portugues);

    const hoje = formatDateISO(new Date());
    state.tarefas.push(
      {
        id: uid(),
        titulo: 'Revisar Ondas e Radiação',
        data: hoje,
        hora: '14:00',
        materiaId: fisica.id,
        prioridade: 'alta',
        duracao: 60,
        notas: 'Atividade de física',
        concluida: false
      },
      {
        id: uid(),
        titulo: 'Exercícios de Funções',
        data: hoje,
        hora: '16:00',
        materiaId: matematica.id,
        prioridade: 'media',
        duracao: 45,
        notas: '',
        concluida: false
      }
    );

    state.metas.push({
      id: uid(),
      titulo: 'Dominar o conteúdo de Física do 2º bimestre',
      descricao: 'Completar todas as listas e fazer resumos',
      prazo: formatDateISO(new Date(new Date().getFullYear(), 11, 15)),
      progresso: 20,
      materiaId: fisica.id
    });

    saveState();
  }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  seedIfEmpty();
  initNavigation();
  initModals();
  initDiarioControls();
  initMensalControls();
  populateMateriaSelects();
  switchView('dashboard');
});
