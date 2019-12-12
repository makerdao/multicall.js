import { WebSocket } from 'mock-socket';

WebSocket.prototype.on = function(event, cb) {
  this[`on${event}`] = cb.bind(this);
};

WebSocket.prototype.removeListener = function(event) {
  this[`on${event}`] = null;
};

WebSocket.prototype.removeAllListeners = function() {
  this.onopen = null;
  this.onclose = null;
  this.onerror = null;
  this.onmessage = null;
};

export { WebSocket as default };
