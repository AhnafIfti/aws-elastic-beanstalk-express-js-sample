const assert = require('assert');
const request = require('supertest');
const app = require('../app');

describe('Express app', () => {
  it('GET / responds 200 with "Hello World!"', async () => {
    const res = await request(app).get('/');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.text, 'Hello World!');
  });

  it('GET /does-not-exist responds 404', async () => {
    const res = await request(app).get('/does-not-exist');
    assert.strictEqual(res.status, 404);
  });
});
