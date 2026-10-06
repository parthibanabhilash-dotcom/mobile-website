import { createServer } from 'node:http';
import { createHmac, randomBytes } from 'node:crypto';
const orders = new Map<string, { id: string; amount: number; currency: string }>(),
  payments = new Map<
    string,
    {
      id: string;
      order_id: string;
      amount: number;
      currency: string;
      status: string;
      method: string;
    }
  >();
let sequence = 0;
const prefix = randomBytes(6).toString('hex');
createServer(async (req, res) => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  res.setHeader('Content-Type', 'application/json');
  function reply(data: unknown, status = 200) {
    res.statusCode = status;
    res.end(JSON.stringify(data));
  }
  const url = req.url || '';
  if (url === '/v1/orders' && req.method === 'POST') {
    const id = `order_fixture${prefix}${++sequence}`;
    const order = { id, amount: body.amount, currency: body.currency };
    orders.set(id, order);
    reply(order);
    return;
  }
  if (url === '/test/pay' && req.method === 'POST') {
    const order = orders.get(body.orderId);
    if (!order) {
      reply({ error: 'Unknown order' }, 404);
      return;
    }
    const id = `pay_fixture${prefix}${++sequence}`;
    const payment = {
      id,
      order_id: order.id,
      amount: order.amount + (body.amountDelta || 0),
      currency: order.currency,
      status: body.status || 'captured',
      method: 'upi',
    };
    payments.set(id, payment);
    reply({
      razorpay_payment_id: id,
      razorpay_signature: createHmac('sha256', 'fixture-secret')
        .update(`${order.id}|${id}`)
        .digest('hex'),
    });
    return;
  }
  if (url === '/test/capture' && req.method === 'POST') {
    const payment = payments.get(body.paymentId);
    if (!payment) {
      reply({ error: 'Unknown payment' }, 404);
      return;
    }
    payment.status = 'captured';
    reply(payment);
    return;
  }
  if (url.startsWith('/v1/payments/')) {
    const payment = payments.get(url.split('/').at(-1)!);
    reply(payment || { error: 'Unknown payment' }, payment ? 200 : 404);
    return;
  }
  if (/^\/v1\/orders\/[^/]+\/payments$/.test(url)) {
    const orderId = url.split('/')[3];
    reply({ items: [...payments.values()].filter((p) => p.order_id === orderId) });
    return;
  }
  reply({ error: 'Not found' }, 404);
}).listen(4060, '127.0.0.1', () => console.log('Isolated test gateway at http://127.0.0.1:4060'));
