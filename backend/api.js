/* Camada de comunicação com a API. Tudo que fala com o backend passa por
 * aqui — o resto do app.js só chama api.get/post/put/del e recebe JSON. */
// window.APP_BASE vem de index.php (caminhoBaseApp()) -- "" na raiz do
// dominio, ou "/gestao-dados" (etc.) se o portal foi instalado numa
// subpasta. Sem isso, a API quebraria sempre que o projeto nao estivesse
// direto na raiz do dominio.
const API_BASE = (window.APP_BASE || '') + '/api';

function getToken() { return localStorage.getItem('gov_token'); }
function setToken(t) { localStorage.setItem('gov_token', t); }
function clearToken() { localStorage.removeItem('gov_token'); }

class ApiError extends Error {}

async function apiFetch(path, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(API_BASE + path, Object.assign({}, opts, { headers }));
  } catch (e) {
    throw new ApiError('Não foi possível falar com o servidor. Ele está rodando?');
  }

  if (res.status === 401) {
    clearToken();
    if (window.onSessionExpired) window.onSessionExpired();
    throw new ApiError('Sessão expirada');
  }
  if (!res.ok) {
    let msg = 'Erro na requisição (' + res.status + ')';
    try { const j = await res.json(); if (j.detail) msg = j.detail; } catch (e) {}
    throw new ApiError(msg);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const api = {
  get:   (path) => apiFetch(path),
  post:  (path, data) => apiFetch(path, { method: 'POST', body: JSON.stringify(data) }),
  put:   (path, data) => apiFetch(path, { method: 'PUT', body: JSON.stringify(data) }),
  // data e opcional -- so usado hoje pela exclusao em lote (DELETE com
  // corpo JSON: { tamanho } ou { ids }). Sem data, continua um DELETE puro.
  del:   (path, data) => apiFetch(path, data === undefined ? { method: 'DELETE' } : { method: 'DELETE', body: JSON.stringify(data) }),
  patch: (path, data) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(data) }),

  async login(username, password) {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);
    const res = await fetch(API_BASE + '/auth/login', { method: 'POST', body });
    if (!res.ok) {
      let msg = 'Usuário ou senha inválidos';
      try { const j = await res.json(); if (j.detail) msg = j.detail; } catch (e) {}
      throw new ApiError(msg);
    }
    return res.json();
  },

  async logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignora -- mesmo se a chamada falhar (rede caiu, token já expirado
      // etc.), ainda limpamos o token local e encerramos a sessão no navegador.
    }
    clearToken();
  },
};
