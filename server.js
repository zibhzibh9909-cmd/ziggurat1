// سيرفر الزقورة — يمرّر الرسائل بين اللاعبين في كل غرفة
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: process.env.PORT || 8080 });
const rooms = new Map();
const out = (c, o) => { if (c.readyState === 1) c.send(JSON.stringify(o)); };
wss.on('connection', ws => {
  ws.id = Math.random().toString(36).slice(2, 10);
  ws.alive = true;
  ws.on('pong', () => (ws.alive = true));
  ws.on('message', raw => {
    if (raw.length > 2000) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.k === 'j') {
      const r = String(m.room || 'main').slice(0, 32);
      if (!rooms.has(r)) rooms.set(r, new Set());
      const s = rooms.get(r);
      if (s.size >= 40) return ws.close();
      s.forEach(c => c.pres && out(ws, { k: 'p', id: c.id, d: c.pres }));
      ws.room = r; s.add(ws); return;
    }
    const s = rooms.get(ws.room); if (!s) return;
    if (m.k === 'p') ws.pres = m.d;
    else if (m.k !== 'e') return;
    s.forEach(c => c !== ws && out(c, { k: m.k, id: ws.id, t: m.t, d: m.d }));
  });
  ws.on('close', () => {
    const s = rooms.get(ws.room); if (!s) return;
    s.delete(ws); s.forEach(c => out(c, { k: 'l', id: ws.id }));
    if (!s.size) rooms.delete(ws.room);
  });
});
setInterval(() => wss.clients.forEach(w => { if (!w.alive) return w.terminate(); w.alive = false; w.ping(); }), 30000);
console.log('Ziggurat server running');
