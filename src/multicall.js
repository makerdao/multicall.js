import aggregate from './aggregate';

function isEmpty(obj) {
  if (Array.isArray(obj)) return obj.length === 0;
  return !obj || Object.keys(obj).length === 0;
}

function isNewState(type, value, store) {
  return store[type] === undefined || store[type] !== value;
}

export function createWatcher(defaultModel, config) {
  const state = {
    model: defaultModel,
    store: {},
    latestBlock: null,
    listeners: [],
    handler: null,
    watching: false,
    config,
    id: 0
  };

  state.hasCompletedInitialFetch = new Promise(resolve => {
    state.initialFetchResolver = resolve;
  });

  function subscribe(listener, id, batch = false) {
    // TODO emit everything they've missed if we have cached state?
    state.listeners.push({ listener, id, batch });
  }

  function pingListeners(events) {
    if (!isEmpty(events))
      state.listeners.forEach(({ listener, batch }) =>
        batch ? listener(events) : events.forEach(listener)
      );
  }

  function poll() {
    this.state.handler = setTimeout(async () => {
      const {
        results: { blockNumber, ...data },
        keyToArgMap
      } = await aggregate(this.state.model, config);

      state.initialFetchResolver();

      if (blockNumber === state.latestBlock) poll.call({ state: this.state });
      else {
        const events = Object.entries(data)
          .filter(([type, value]) => isNewState(type, value, this.state.store))
          .map(([type, value]) => ({
            type,
            value,
            args: keyToArgMap[type] || []
          }));
        this.state.store = { ...data, keyToArgMap };
        pingListeners(events);
        poll.call({ state: this.state });
      }
      // TODO change interval if we haven't hit a new block
    }, this.interval || config.interval || 1000);
  }

  // TODO bring templates back
  const watcher = {
    tap(transform) {
      const nextModel = transform([...state.model]);
      state.model = [...nextModel];
      if (state.watching) {
        clearTimeout(state.handler);
        state.handler = null;
        poll.call({ state });
      }
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
    batchStateDiffs() {
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
    startWatch() {
      state.watching = true;
      poll.call({ state, interval: 0 });
      return watcher;
    },
    stopWatch() {
      clearTimeout(state.handler);
      state.handler = null;
      state.watching = false;
    },
    setConfig(_config) {
      state.config = { ..._config };
      if (state.watching) {
        clearTimeout(state.handler);
        state.handler = null;
        poll.call({ state, interval: 0 });
      }
    },
    awaitInitialFetch() {
      return state.hasCompletedInitialFetch;
    }
  };
  return watcher;
}
