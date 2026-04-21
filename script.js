// Inicialização do AOS
AOS.init({
  duration: 800,
  once: false,
  offset: 100,
  easing: 'ease-out-cubic',
  delay: 0
});

// Transição de entrada
window.addEventListener('load', () => {
  const transition = document.getElementById('pageTransition');
  if (transition) {
    setTimeout(() => {
      transition.classList.add('hide');
      setTimeout(() => {
        transition.style.display = 'none';
      }, 800);
    }, 1200);
  }
});

// Navbar scroll
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
});

document.getElementById('currentYear').textContent = new Date().getFullYear();

// Galeria Modal
const modal = document.getElementById('galleryModal');
const modalImg = document.getElementById('modalImage');
const closeModal = document.querySelector('.close-modal');
if (modal && modalImg && closeModal) {
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      modalImg.src = item.dataset.img;
      modal.classList.add('active');
    });
  });
  closeModal.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('active'); });
}

// ============================================
// SISTEMA DE RESERVA (Google Apps Script)
// ============================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwRJplEccWvNLu9WVBeVygAylrdj6jHC9Pk5cbQKe3WORpaYooYb356c6PHRDikx8ph/exec';
const TOKEN = 'casa_nanquim_2025_secret_token';
const HORARIOS_BASE = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

let duracaoHoras = null;
let duracaoSelecionada = null;
let valorSelecionado = null;
let dataSelecionada = null;
let horarioSelecionado = null;

const dataInput = document.getElementById('data');
const horariosContainer = document.getElementById('horariosContainer');
const submitBtn = document.getElementById('submitBtn');
const mensagemDiv = document.getElementById('mensagem');
const statusIcon = document.getElementById('statusIcon');
const statusText = document.getElementById('statusText');
const ultimaAtualizacao = document.getElementById('ultimaAtualizacao');

function normalizarHorario(horario) {
  if (!horario) return '';
  if (typeof horario === 'string' && /^\d{2}:\d{2}$/.test(horario)) return horario;
  const str = String(horario);
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  return str;
}

function atualizarStatus(status, texto) {
  if (status === 'online') {
    statusIcon.className = 'fas fa-check-circle me-2';
    statusIcon.style.color = '#00ff00';
    statusText.textContent = 'Conectado';
    ultimaAtualizacao.textContent = texto;
  } else {
    statusIcon.className = 'fas fa-exclamation-triangle me-2';
    statusIcon.style.color = '#ff6600';
    statusText.textContent = 'Erro de conexão';
    ultimaAtualizacao.textContent = texto;
  }
}

async function buscarReservas() {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getBookings&token=${TOKEN}`);
    const data = await response.json();
    if (data.success) {
      atualizarStatus('online', `Atualizado ${new Date().toLocaleTimeString()}`);
    }
  } catch (error) {
    console.error('Erro:', error);
    atualizarStatus('offline', 'Erro de conexão');
  }
}

function calcularFim(inicio, horas) {
  const [h, m] = inicio.split(':').map(Number);
  let horaFim = h + horas;
  return `${horaFim.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function gerarHorariosDisponiveis() {
  if (!duracaoHoras || !dataSelecionada) return [];
  const horarios = [];
  for (const inicio of HORARIOS_BASE) {
    const inicioHora = parseInt(inicio.split(':')[0]);
    const fimHora = inicioHora + duracaoHoras;
    if (fimHora <= 20) {
      horarios.push({ inicio, fim: calcularFim(inicio, duracaoHoras), display: `${inicio} - ${calcularFim(inicio, duracaoHoras)}` });
    }
  }
  return horarios;
}

function renderizarHorarios() {
  if (!duracaoHoras) {
    horariosContainer.innerHTML = '<div class="texto-muted">Primeiro, selecione a duração da sessão</div>';
    return;
  }
  if (!dataSelecionada) {
    horariosContainer.innerHTML = '<div class="texto-muted">Selecione uma data</div>';
    return;
  }

  const [ano, mes, dia] = dataSelecionada.split('-').map(Number);
  const dataObjUTC = new Date(Date.UTC(ano, mes - 1, dia));
  const diaSemanaUTC = dataObjUTC.getUTCDay();
  const hojeUTC = new Date();
  hojeUTC.setUTCHours(0, 0, 0, 0);
  const dataSelecionadaUTC = new Date(Date.UTC(ano, mes - 1, dia));

  if (dataSelecionadaUTC < hojeUTC) {
    horariosContainer.innerHTML = '<div class="alert alert-danger">⚠️ Data passada</div>';
    return;
  }
  if (diaSemanaUTC === 0 || diaSemanaUTC === 6) {
    horariosContainer.innerHTML = '<div class="alert alert-danger">⚠️ Estúdio fechado aos fins de semana</div>';
    return;
  }

  const horarios = gerarHorariosDisponiveis();
  if (horarios.length === 0) {
    horariosContainer.innerHTML = '<div class="alert alert-danger">⚠️ Nenhum horário disponível para esta duração</div>';
    return;
  }

  let html = '';
  for (const h of horarios) {
    const selectedClass = (horarioSelecionado === h.inicio) ? 'selected' : '';
    html += `<button type="button" class="horario-btn ${selectedClass}" data-inicio="${h.inicio}" data-fim="${h.fim}">${h.display}</button>`;
  }
  horariosContainer.innerHTML = html;

  document.querySelectorAll('.horario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      horarioSelecionado = btn.dataset.inicio;
    });
  });
}

function initDuracao() {
  const botoes = document.querySelectorAll('.opcao-btn');
  botoes.forEach(btn => {
    btn.addEventListener('click', async () => {
      botoes.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      duracaoHoras = parseInt(btn.dataset.duracao);
      duracaoSelecionada = btn.dataset.duracao + 'h';
      valorSelecionado = btn.dataset.valor;
      horarioSelecionado = null;
      if (dataSelecionada) {
        await buscarReservas();
        renderizarHorarios();
      }
    });
  });
}

async function onDataChange() {
  dataSelecionada = dataInput.value;
  horarioSelecionado = null;
  if (dataSelecionada && duracaoHoras) {
    await buscarReservas();
    renderizarHorarios();
  } else if (dataSelecionada && !duracaoHoras) {
    horariosContainer.innerHTML = '<div class="texto-muted">Primeiro, selecione a duração da sessão</div>';
  } else {
    horariosContainer.innerHTML = '<div class="texto-muted">Selecione uma data</div>';
  }
}

async function enviarReserva(dados) {
  try {
    const params = new URLSearchParams();
    params.append('action', 'createBooking');
    params.append('token', TOKEN);
    params.append('data', JSON.stringify(dados));
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function mostrarMensagem(texto, tipo) {
  const classe = tipo === 'sucesso' ? 'alert-success' : 'alert-danger';
  mensagemDiv.innerHTML = `<div class="alert ${classe}">${texto}</div>`;
  setTimeout(() => {
    if (mensagemDiv.innerHTML.includes(texto)) mensagemDiv.innerHTML = '';
  }, 5000);
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.innerHTML = loading
    ? '<span class="loading-spinner"></span> Enviando...'
    : '<i class="fas fa-calendar-check me-2"></i> Solicitar Reserva';
}

async function onSubmit(e) {
  e.preventDefault();
  const nome = document.getElementById('nome').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const email = document.getElementById('email').value.trim();
  if (!nome) return mostrarMensagem('⚠️ Informe seu nome', 'erro');
  if (!whatsapp) return mostrarMensagem('⚠️ Informe seu WhatsApp', 'erro');
  if (!duracaoHoras) return mostrarMensagem('⚠️ Selecione a duração da sessão', 'erro');
  if (!dataSelecionada) return mostrarMensagem('⚠️ Selecione uma data', 'erro');
  if (!horarioSelecionado) return mostrarMensagem('⚠️ Selecione um horário', 'erro');

  setLoading(true);
  const fim = calcularFim(horarioSelecionado, duracaoHoras);
  const dados = {
    data: dataSelecionada, horario: horarioSelecionado, horarioFim: fim,
    duracao: duracaoSelecionada, duracaoHoras: duracaoHoras, valor: valorSelecionado,
    nome: nome, whatsapp: whatsapp, email: email,
    timestamp: new Date().toISOString(), status: 'Pendente'
  };
  const result = await enviarReserva(dados);
  if (result.success) {
    mostrarMensagem('✅ Reserva solicitada com sucesso! Entraremos em contato.', 'sucesso');
    document.getElementById('reservaForm').reset();
    duracaoHoras = null; duracaoSelecionada = null; valorSelecionado = null;
    dataSelecionada = null; horarioSelecionado = null;
    dataInput.value = '';
    horariosContainer.innerHTML = '<div class="texto-muted">Primeiro, selecione a duração e a data</div>';
    document.querySelectorAll('.opcao-btn').forEach(btn => btn.classList.remove('selected'));
    await buscarReservas();
  } else {
    mostrarMensagem(`❌ ${result.error}`, 'erro');
  }
  setLoading(false);
}

async function init() {
  initDuracao();
  dataInput.addEventListener('change', onDataChange);
  document.getElementById('reservaForm').addEventListener('submit', onSubmit);
  const hoje = new Date().toISOString().split('T')[0];
  dataInput.min = hoje;
  await buscarReservas();
  setInterval(async () => {
    if (dataSelecionada && duracaoHoras) {
      await buscarReservas();
      renderizarHorarios();
    }
  }, 10000);
}

init();

// Scroll reveal adicional para elementos que não usam AOS
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.card-ink, .gallery-item, .opcao-btn').forEach(el => {
  if (!el.hasAttribute('data-aos')) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
  }
});
