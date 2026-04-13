const BASE = 'https://arquitectura.onrender.com';

let usuarioActual = "";
let chatActual = null;
let todosLosUsuarios = [];

// ── HELPERS ─────────────────────────────────────────────────
function initiales(nombre) {
  return nombre.split(' ').map(w => w[0].toUpperCase()).join('').slice(0, 2);
}

function colorForUser(nombre) {
  const paleta = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#ec4899,#f43f5e)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#06b6d4,#0891b2)',
    'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  ];
  let h = 0;
  for (let c of nombre) h = (h * 31 + c.charCodeAt(0)) % paleta.length;
  return paleta[h];
}

function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── LOGIN ────────────────────────────────────────────────────
async function login() {
  const username = document.getElementById('user').value.trim();
  const password = document.getElementById('pass').value;

  if (!username || !password) {
    alert('Completa todos los campos');
    return;
  }

  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (res.ok) {
    usuarioActual = username;
    document.getElementById('usuario').innerText = username;
    document.getElementById('mi-avatar').innerText = initiales(username);
    document.getElementById('mi-avatar').style.background = colorForUser(username);
    document.getElementById('login').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    cargarUsuarios();
  } else {
    alert('Usuario o contraseña incorrectos');
  }
}

// REGISTRO ─────────────────────────────────────────────────
async function registro() {
  const username = document.getElementById('user').value.trim();
  const password = document.getElementById('pass').value;

  if (!username || !password) {
    alert('Completa todos los campos');
    return;
  }

  const res = await fetch(`${BASE}/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (res.ok) {
    alert('¡Cuenta creada! Ahora puedes iniciar sesión.');
  } else {
    alert('El usuario ya existe');
  }
}

// ── SIDEBAR ──────────────────────────────────────────────────
async function cargarUsuarios() {
  const res = await fetch(`${BASE}/usuarios`);
  todosLosUsuarios = await res.json();
  renderUsuarios(todosLosUsuarios);
}

function renderUsuarios(lista) {
  const cont = document.getElementById('usuarios');

  cont.innerHTML = `
    <div class="s-section">Canales</div>
    <div class="usuario activo" onclick="abrirChat(null,this)">
      <div class="chat-avatar" style="background:#374151;font-size:18px;">🌍</div>
      <div class="ci-info">
        <div class="ci-name">Chat Global</div>
        <div class="ci-preview">Todos los participantes</div>
      </div>
    </div>
    <div class="s-section" style="margin-top:4px;">Directos</div>
  `;

  lista.forEach(u => {
    if (u.username !== usuarioActual) {
      cont.innerHTML += `
        <div class="usuario" onclick="abrirChat('${u.username}',this)">
          <div class="chat-avatar" style="background:${colorForUser(u.username)};">
            ${initiales(u.username)}
          </div>
          <div class="ci-info">
            <div class="ci-name">${u.username}</div>
            <div class="ci-preview">Toca para chatear</div>
          </div>
        </div>
      `;
    }
  });
}

function filtrarUsuarios(q) {
  if (!q.trim()) { renderUsuarios(todosLosUsuarios); return; }
  const f = todosLosUsuarios.filter(u =>
    u.username.toLowerCase().includes(q.toLowerCase())
  );
  renderUsuarios(f);
}

// ── ABRIR CHAT ───────────────────────────────────────────────
function abrirChat(usuario, elemento) {
  chatActual = usuario;

  document.querySelectorAll('.usuario').forEach(u => u.classList.remove('activo'));
  elemento.classList.add('activo');

  const icon = document.getElementById('ch-icon');

  if (usuario) {
    icon.innerText = initiales(usuario);
    icon.style.background = colorForUser(usuario);
    document.getElementById('chat-nombre').innerText = 'Chat con ' + usuario;
    document.getElementById('chat-status').innerText = 'En línea';
    document.getElementById('chat-status').style.color = '#22c55e';
  } else {
    icon.innerText = '🌍';
    icon.style.background = 'linear-gradient(135deg,#06b6d4,#0891b2)';
    document.getElementById('chat-nombre').innerText = 'Chat Global';
    document.getElementById('chat-status').innerText = 'Canal público';
    document.getElementById('chat-status').style.color = '#94a3b8';
  }

  cargarMensajes();
}

// ── CARGAR MENSAJES ──────────────────────────────────────────
async function cargarMensajes() {
  if (!usuarioActual) return;

  const res = await fetch(`${BASE}/mensajes/` + usuarioActual);
  const data = await res.json();
  const cont = document.getElementById('mensajes');
  cont.innerHTML = '';

  let lastDate = '';

  data.forEach(m => {
    if (chatActual) {
      if (!(
        (m.de === usuarioActual && m.para === chatActual) ||
        (m.de === chatActual && m.para === usuarioActual)
      )) return;
    } else {
      if (m.para !== null) return;
    }

    const fecha = m.fecha ? new Date(m.fecha) : new Date();
    const fechaStr = fecha.toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    const timeStr =
      fecha.getHours().toString().padStart(2, '0') + ':' +
      fecha.getMinutes().toString().padStart(2, '0');

    if (fechaStr !== lastDate) {
      lastDate = fechaStr;
      cont.innerHTML += `<div class="date-sep">${fechaStr}</div>`;
    }

    const esMio = m.de === usuarioActual;
    const tipo = esMio ? 'mine' : '';
    const avatarStyle = `background:${colorForUser(m.de)};`;
    const senderLabel = esMio ? '' : `<div class="m-sender">${m.de}</div>`;
    const tick = esMio ? `<span class="tick"> ✓✓</span>` : '';

    cont.innerHTML += `
      <div class="msg-row ${tipo}">
        <div class="m-avatar" style="${avatarStyle}">${initiales(m.de)}</div>
        <div class="m-content">
          ${senderLabel}
          <div class="bubble">${escHtml(m.mensaje)}</div>
          <div class="m-time">${timeStr}${tick}</div>
        </div>
      </div>
    `;
  });

  if (!cont.innerHTML) {
    cont.innerHTML = '<div class="date-sep">No hay mensajes aún</div>';
  }

  cont.scrollTop = cont.scrollHeight;
}

// ── ENVIAR MENSAJE ───────────────────────────────────────────
async function enviar() {
  const input = document.getElementById('mensaje');
  const mensaje = input.value.trim();
  if (!mensaje || !usuarioActual) return;

  input.value = '';

  await fetch(`${BASE}/mensaje`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ de: usuarioActual, para: chatActual, mensaje })
  });

  cargarMensajes();
}

// ── EVENTOS ──────────────────────────────────────────────────
document.getElementById('mensaje').addEventListener('keypress', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
});

['user', 'pass'].forEach(id => {
  document.getElementById(id).addEventListener('keypress', e => {
    if (e.key === 'Enter') login();
  });
});

// ── AUTO REFRESH ─────────────────────────────────────────────
setInterval(() => {
  if (usuarioActual && chatActual !== undefined) cargarMensajes();
  if (usuarioActual) cargarUsuarios();
}, 3000);
