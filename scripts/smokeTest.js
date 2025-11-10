const http = require('http');
const querystring = require('querystring');

const host = 'localhost';
const port = 3000;

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ res, data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function login(email, password) {
  const postData = querystring.stringify({ email, password });
  const options = {
    hostname: host,
    port,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  const { res } = await httpRequest(options, postData);
  const setCookie = res.headers['set-cookie'] || [];
  // keep cookies
  const cookie = setCookie.map(c => c.split(';')[0]).join('; ');
  return { statusCode: res.statusCode, cookie };
}

async function getPath(path, cookie) {
  const options = {
    hostname: host,
    port,
    path,
    method: 'GET',
    headers: cookie ? { Cookie: cookie } : {}
  };
  const { res, data } = await httpRequest(options);
  return { statusCode: res.statusCode, location: res.headers.location, bodyLength: data.length };
}

async function testUser(user) {
  console.log('\n--- Testing', user.email, '---');
  try {
    const loginRes = await login(user.email, user.password);
    console.log('Login status:', loginRes.statusCode, 'cookie:', !!loginRes.cookie);

    const cookie = loginRes.cookie;

    const routes = [
      '/surgeries',
      '/surgeries/new',
      '/materials',
      '/patients',
      '/users'
    ];

    for (const route of routes) {
      const r = await getPath(route, cookie);
      console.log(`${route} -> ${r.statusCode}${r.location ? ' redirect to ' + r.location : ''} (body bytes: ${r.bodyLength})`);
    }
  } catch (err) {
    console.error('Error testing user', user.email, err);
  }
}

(async () => {
  const users = [
    { email: 'admin', password: 'test' },
    { email: 'medecin@example.com', password: 'medecin123' },
    { email: 'acheteur@example.com', password: 'acheteur123' },
    { email: 'chefbloc@example.com', password: 'chefbloc123' }
  ];

  for (const u of users) {
    await testUser(u);
  }
})();
