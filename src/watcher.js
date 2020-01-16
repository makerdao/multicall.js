import WebSocket from 'isomorphic-ws';
import aggregate from './aggregate';
import { isEmpty } from './helpers';
import addresses from './addresses.json';
import debug from 'debug';
const log = debug('multicall');

const reWsEndpoint = /^wss?:\/\//i;

function isNewState(type, value, store) {
  return store[type] === undefined || store[type].toString() !== value.toString();
}

function prepareConfig(config) {
  config = {
    interval: 1000,
    staleBlockRetryWait: 3000,
    errorRetryWait: 5000,
    wsResponseTimeout: 5000,
    wsReconnectTimeout: 5000,
    ...config
  };
  if (config.preset !== undefined) {
    if (addresses[config.preset] !== undefined) {
      config.multicallAddress = addresses[config.preset].multicall;
      config.rpcUrl = addresses[config.preset].rpcUrl;
    } else throw new Error(`Unknown preset ${config.preset}`);
  }
  return config;
}

export default function createWatcher(model, config) {
  const state = {
    model: [...model],
    store: {},
    keyToArgMap: {},
    latestPromiseId: 0,
    latestBlockNumber: null,
    listeners: [],
    onNewBlockListeners: [],
    onPollListeners: [],
    handler: null,
    wsReconnectHandler: null,
    watching: false,
    config: prepareConfig(config),
    id: 0,
    ws: null
  };

  function reconnectWebSocket(timeout) {
    clearTimeout(state.handler);
    state.handler = null;
    clearTimeout(state.wsReconnectHandler);
    state.wsReconnectHandler = setTimeout(() => {
      destroyWebSocket();
      setupWebSocket();
    }, timeout);
  }

  function setupWebSocket() {
    if (reWsEndpoint.test(state.config.rpcUrl)) {
      log(`Connecting to WebSocket ${state.config.rpcUrl}...`);
      state.ws = new WebSocket(state.config.rpcUrl);
      state.ws.onopen = () => {
        log('WebSocket connected');
        if (state.handler) throw new Error('Existing poll setTimeout handler set');
        if (state.watching) {
          poll.call({
            state,
            interval: 0,
            resolveFetchPromise: state.initialFetchResolver
          });
        }
      };
      state.ws.onclose = err => {
        log('WebSocket closed: %s', JSON.stringify(err));
        log(`Reconnecting in ${state.config.wsReconnectTimeout / 1000} seconds.`);
        reconnectWebSocket(state.config.wsReconnectTimeout);
      };
      state.ws.onerror = err => {
        log('WebSocket error: %s', JSON.stringify(err));
        log(`Reconnecting in ${state.config.wsReconnectTimeout / 1000} seconds.`);
        reconnectWebSocket(state.config.wsReconnectTimeout);
      };
    }
  }

  function destroyWebSocket() {
    log('destroyWebSocket()');
    state.ws.onopen = null;
    state.ws.onclose = null;
    state.ws.onerror = null;
    state.ws.onmessage = null;
    state.ws.close();
  }

  setupWebSocket();

  state.initialFetchPromise = new Promise(resolve => {
    state.initialFetchResolver = resolve;
  });

  function subscribe(listener, id, batch = false) {
    if (!isEmpty(state.store)) {
      const events = Object.entries(state.store).map(([type, value]) => ({
        type,
        value,
        args: state.keyToArgMap[type] || []
      }));
      batch ? listener(events) : events.forEach(listener);
    }
    state.listeners.push({ listener, id, batch });
  }

  function alertListeners(events) {
    if (!isEmpty(events))
      state.listeners.forEach(({ listener, batch }) =>
        batch ? listener(events) : events.forEach(listener)
      );
  }

  function poll() {
    const interval = this.interval !== undefined ? this.interval : this.state.config.interval;
    log('poll() called, %s%s', 'interval: ' + interval, this.retry ? ', retry: ' + this.retry : '');
    this.state.handler = setTimeout(async () => {
      try {
        if (!this.state.handler) return;

        this.state.latestPromiseId++;
        const promiseId = this.state.latestPromiseId;

        state.onPollListeners.forEach(({ listener }) =>
          listener({
            id: promiseId,
            latestBlockNumber: this.state.latestBlockNumber,
            ...(this.retry ? { retry: this.retry } : {})
          })
        );

        const {
          results: { blockNumber, ...data },
          keyToArgMap
        } = await aggregate(this.state.model, {
          ...this.state.config,
          ws: this.state.ws,
          id: this.state.latestPromiseId
        });

        if (this.state.cancelPromiseId === promiseId) return;

        if (typeof this.resolveFetchPromise === 'function') this.resolveFetchPromise();

        if (this.state.latestBlockNumber !== null && blockNumber < this.state.latestBlockNumber) {
          // Retry if blockNumber is lower than latestBlockNumber
          log(
            `Stale block returned, retrying in ${this.state.config.staleBlockRetryWait /
              1000} seconds`
          );
          poll.call({
            state: this.state,
            interval: this.state.config.staleBlockRetryWait,
            retry: this.retry ? this.retry + 1 : 1
          });
        } else {
          if (
            this.state.latestBlockNumber === null ||
            (this.state.latestBlockNumber !== null && blockNumber > this.state.latestBlockNumber)
          ) {
            this.state.latestBlockNumber = parseInt(blockNumber);
            state.onNewBlockListeners.forEach(({ listener }) =>
              listener(this.state.latestBlockNumber)
            );
          }
          const events = Object.entries(data)
            .filter(([type, value]) => isNewState(type, value, this.state.store))
            .map(([type, value]) => ({
              type,
              value,
              args: keyToArgMap[type] || []
            }));
          this.state.store = { ...data };
          this.state.keyToArgMap = { ...keyToArgMap };
          alertListeners(events);
          poll.call({ state: this.state });
        }
      } catch (e) {
        log('Error: %s', e.message);
        if (!this.state.handler) return;
        // Retry on error
        log(`Error occured, retrying in ${this.state.config.errorRetryWait / 1000} seconds`);
        poll.call({
          state: this.state,
          interval: this.state.config.errorRetryWait,
          retry: this.retry ? this.retry + 1 : 1
        });
      }
    }, interval);
  }

  const watcher = {
    tap(transform) {
      log('watcher.tap() called');
      const nextModel = transform([...state.model]);
      state.model = [...nextModel];
      return this.poll();
    },
    poll() {
      log('watcher.poll() called');
      let resolveFetchPromise;
      const fetchPromise = new Promise(resolve => {
        resolveFetchPromise = resolve;
      });
      if (state.watching && (!state.ws || state.ws.readyState === WebSocket.OPEN)) {
        clearTimeout(state.handler);
        state.handler = null;
        poll.call({ state, interval: 0, resolveFetchPromise });
        return fetchPromise;
      }
      return Promise.resolve();
    },
    subscribe(listener) {
      const id = state.id++;
      subscribe(listener, id, false);
      return {
        unsub() {
          state.listeners = state.listeners.filter(({ id: _id }) => _id !== id);
        }
      };
    },
    onNewBlock(listener) {
      const id = state.id++;
      state.latestBlockNumber && listener(state.latestBlockNumber);
      state.onNewBlockListeners.push({ listener, id });
      return {
        unsub() {
          state.onNewBlockListeners = state.onNewBlockListeners.filter(({ id: _id }) => _id !== id);
        }
      };
    },
    onPoll(listener) {
      const id = state.id++;
      state.onPollListeners.push({ listener, id });
      return {
        unsub() {
          state.onPollListeners = state.onPollListeners.filter(({ id: _id }) => _id !== id);
        }
      };
    },
    batch() {
      return {
        subscribe(listener) {
          const id = state.id++;
          subscribe(listener, id, true);
          return {
            unsub() {
              state.listeners = state.listeners.filter(({ id: _id }) => _id !== id);
            }
          };
        }
      };
    },
    start() {
      state.watching = true;
      if (!state.ws || state.ws.readyState === WebSocket.OPEN) {
        poll.call({
          state,
          interval: 0,
          resolveFetchPromise: state.initialFetchResolver
        });
      }
      return state.initialFetchPromise;
    },
    startWatch() {
      return this.start();
    },
    stop() {
      clearTimeout(state.handler);
      state.handler = null;
      clearTimeout(state.wsReconnectHandler);
      state.wsReconnectHandler = null;
      state.watching = false;
    },
    recreate(model, config) {
      clearTimeout(state.handler);
      state.handler = null;
      clearTimeout(state.wsReconnectHandler);
      state.wsReconnectHandler = null;
      if (state.ws) destroyWebSocket();
      state.ws = null;
      state.config = prepareConfig(config);
      state.model = [...model];
      state.store = {};
      state.latestBlockNumber = null;
      state.cancelPromiseId = state.latestPromiseId;
      setupWebSocket();
      if (state.watching && !state.ws) {
        let resolveFetchPromise;
        const fetchPromise = new Promise(resolve => {
          resolveFetchPromise = resolve;
        });
        poll.call({
          state,
          interval: 0,
          resolveFetchPromise
        });
        return fetchPromise;
      }
      return Promise.resolve();
    },
    awaitInitialFetch() {
      return state.initialFetchPromise;
    }
  };

  return watcher;
}
