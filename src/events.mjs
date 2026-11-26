import { EventEmitter } from 'node:events';

export class ControlPlaneEventBus {
  constructor({ maxStreams = 8, heartbeatMs = 15_000 } = {}) {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(64);
    this.maxStreams = Math.max(1, Number(maxStreams) || 8);
    this.heartbeatMs = Math.max(5_000, Number(heartbeatMs) || 15_000);
    this.activeStreams = new Set();
    this.seq = 0;
  }

  emit(type, payload = {}) {
    this.seq += 1;
    const event = {
      id: this.seq,
      type: String(type || 'update'),
      ts: new Date().toISOString(),
      payload,
    };
    this.emitter.emit('event', event);
    return event;
  }

  getActiveCount() {
    return this.activeStreams.size;
  }

  attachSse(req, res, securityHeaders = {}) {
    if (this.activeStreams.size >= this.maxStreams) {
      res.writeHead(429, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...securityHeaders,
      });
      res.end(JSON.stringify({ ok: false, error: 'Too many concurrent SSE event streams' }));
      return false;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...securityHeaders,
    });

    const sendFrame = (eventName, data, id) => {
      if (res.writableEnded || res.destroyed) return;
      try {
        if (id != null) res.write(`id: ${id}\n`);
        res.write(`event: ${eventName}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch {
        cleanup();
      }
    };

    const onEvent = (evt) => {
      sendFrame(evt.type, evt, evt.id);
    };

    const heartbeat = setInterval(() => {
      if (res.writableEnded || res.destroyed) {
        cleanup();
        return;
      }
      try {
        res.write(`: keepalive ${Date.now()}\n\n`);
      } catch {
        cleanup();
      }
    }, this.heartbeatMs);
    heartbeat.unref?.();

    const streamHandle = {
      close: () => {
        cleanup();
        if (!res.writableEnded) {
          try {
            res.end();
          } catch {
            // ignore
          }
        }
      },
    };

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearInterval(heartbeat);
      this.emitter.off('event', onEvent);
      this.activeStreams.delete(streamHandle);
    };

    this.activeStreams.add(streamHandle);
    this.emitter.on('event', onEvent);
    req.on('close', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);

    sendFrame('connected', {
      type: 'connected',
      ts: new Date().toISOString(),
      activeStreams: this.activeStreams.size,
    });
    return true;
  }

  closeAll() {
    for (const handle of [...this.activeStreams]) {
      handle.close();
    }
  }
}
