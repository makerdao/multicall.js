import aggregate from './aggregate';
import { isEmpty } from './helpers';
import addresses from './addresses.json';

function isNewState(type, value, store) {
  return (
    store[type] === undefined || store[type].toString() !== value.toString()
  );
}

function prepareConfig(_config) {
  const config = { ..._config };
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
    newBlockListeners: [],
    handler: null,
    watching: false,
    config: prepareConfig(config),
    id: 0
  };

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

  function onNewBlockSubscribe(listener, id) {
    state.latestBlockNumber && listener(state.latestBlockNumber);
    state.newBlockListeners.push({ listener, id });
  }

  function alertListeners(events) {
    if (!isEmpty(events))
      state.listeners.forEach(({ listener, batch }) =>
        batch ? listener(events) : events.forEach(listener)
      );
  }

  function poll() {
    const interval =
      this.interval !== undefined
        ? this.interval
        : this.state.config.interval !== undefined
        ? this.state.config.interval
        : 1000;
    this.state.handler = setTimeout(async () => {
      this.state.latestPromiseId++;
      const promiseId = this.state.latestPromiseId;
      const {
        results: { blockNumber, ...data },
        keyToArgMap
      } = await aggregate(this.state.model, this.state.config);

      if (this.state.cancelPromiseId === promiseId) return;

      if (typeof this.resolveFetchPromise === 'function')
        this.resolveFetchPromise();

      if (
        this.state.latestBlockNumber !== null &&
        blockNumber < this.state.latestBlockNumber
      ) {
        // Retry immediately if blockNumber is lower than latestBlockNumber
        poll.call({ state: this.state, interval: 0 });
      } else {
        if (
          this.state.latestBlockNumber === null ||
          (this.state.latestBlockNumber !== null &&
            blockNumber > this.state.latestBlockNumber)
        ) {
          this.state.latestBlockNumber = blockNumber;
          state.newBlockListeners.forEach(({ listener }) =>
            listener(blockNumber)
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
    }, interval);
  }

  const watcher = {
    tap(transform) {
      let resolveFetchPromise;
      const fetchPromise = new Promise(resolve => {
        resolveFetchPromise = resolve;
      });
      const nextModel = transform([...state.model]);
      state.model = [...nextModel];
      if (state.watching) {
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
      onNewBlockSubscribe(listener, id);
      return {
        unsub() {
          state.newBlockListeners = state.newBlockListeners.filter(
            ({ id: _id }) => _id !== id
          );
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
              state.listeners = state.listeners.filter(
                ({ id: _id }) => _id !== id
              );
            }
          };
        }
      };
    },
    start() {
      state.watching = true;
      poll.call({
        state,
        interval: 0,
        resolveFetchPromise: state.initialFetchResolver
      });
      return watcher;
    },
    startWatch() {
      return this.start();
    },
    stop() {
      clearTimeout(state.handler);
      state.handler = null;
      state.watching = false;
    },
    recreate(model, config) {
      clearTimeout(state.handler);
      state.handler = null;
      state.config = prepareConfig(config);
      state.model = [...model];
      state.store = {};
      state.latestBlockNumber = null;
      state.cancelPromiseId = state.latestPromiseId;
      if (state.watching) {
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
