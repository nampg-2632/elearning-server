// Settings from config.js. A value nginx did not fill in is still "${...}".
const settings = window.GOOGLE_LOGIN_CONFIG || {};
const filled = (value) => (value && !value.startsWith('${') ? value : '');
const clientId = filled(settings.clientIds).split(',')[0].trim();
const apiBase = filled(settings.apiBase).replace(/\/$/, '');

const $ = (id) => document.getElementById(id);

// The app's access token, kept in memory only: reloading the page forgets it.
let accessToken = null;

function showStatus(text, kind) {
  $('status').textContent = text;
  $('status').className = kind || '';
}

function setLoggedIn(token) {
  accessToken = token;
  $('session').hidden = !token;
}

// Calls the API and prints "<status> <method> <path>" and the JSON body.
async function callApi(method, path, { body, auth } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (auth) headers.authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // 204 or a non-JSON error page.
  }
  $('result').textContent =
    `${res.status} ${method} ${path}\n\n` +
    (data ? JSON.stringify(data, null, 2) : text);
  return { res, data };
}

async function run(action) {
  try {
    await action();
  } catch (error) {
    showStatus(
      `Không gọi được API ${apiBase} (CORS? server?): ${error}`,
      'error',
    );
  }
}

function onCredential({ credential }) {
  $('idToken').value = credential;
  showStatus('Đang gọi API…');
  return run(async () => {
    const { res, data } = await callApi('POST', '/auth/google', {
      body: { idToken: credential },
    });
    setLoggedIn(res.ok ? data.accessToken : null);
    showStatus(
      res.ok ? 'Đăng nhập thành công' : `Lỗi ${res.status}`,
      res.ok ? 'ok' : 'error',
    );
  });
}

function getProfile() {
  return run(async () => {
    const { res } = await callApi('GET', '/me', { auth: true });
    showStatus(
      res.ok ? 'Token còn hiệu lực' : `Token bị từ chối (${res.status})`,
      res.ok ? 'ok' : 'error',
    );
  });
}

// Revokes the app token (POST /auth/logout), then shows that GET /me now
// answers 401. The Google session is left alone, as a real app would.
function logout() {
  return run(async () => {
    const { res } = await callApi('POST', '/auth/logout', { auth: true });
    if (!res.ok) {
      showStatus(`Đăng xuất lỗi (${res.status})`, 'error');
      return;
    }
    const { res: check } = await callApi('GET', '/me', { auth: true });
    setLoggedIn(null);
    showStatus(
      check.status === 401
        ? 'Đã đăng xuất: token cũ bị từ chối (401)'
        : `Đã đăng xuất nhưng GET /me trả ${check.status}`,
      check.status === 401 ? 'ok' : 'error',
    );
  });
}

$('me').addEventListener('click', getProfile);
$('logout').addEventListener('click', logout);

// Called by the Google library once it has loaded.
window.onGoogleLibraryLoad = () => {
  if (!clientId || !apiBase) {
    showStatus(
      'Chưa cấu hình GOOGLE_CLIENT_ID hoặc GOOGLE_LOGIN_API_BASE.',
      'error',
    );
    return;
  }
  google.accounts.id.initialize({
    client_id: clientId,
    callback: onCredential,
  });
  google.accounts.id.renderButton($('button'), {
    theme: 'outline',
    size: 'large',
  });
};
