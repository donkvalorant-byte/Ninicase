const http = require('http');

function postRequest(path, data, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    };
    if (token) options.headers.Authorization = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function testRegister() {
  try {
    const data = await postRequest('/register', {
      email: 'test@example.com',
      password: '123456',
      adminKey: 'supersecretadminkey'
    });
    console.log('Register response:', data);
  } catch (err) {
    console.error('Register error:', err);
  }
}

async function testLogin() {
  try {
    const data = await postRequest('/login', {
      email: 'test@example.com',
      password: '123456'
    });
    console.log('Login response:', data);
    return data.token;
  } catch (err) {
    console.error('Login error:', err);
  }
}

async function testOpenCase(token) {
  try {
    const data = await postRequest('/cases/1/open', {}, token);
    console.log('Open case response:', data);
  } catch (err) {
    console.error('Open case error:', err);
  }
}

async function runTests() {
  await testRegister();
  const token = await testLogin();
  if (token) await testOpenCase(token);
}

runTests();