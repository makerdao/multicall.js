import aggregate from './aggregate';
import config from './config.json';

export default class MultiCall {
  config = {};
  globals = {};
  templates = {};
  registered = [];
  onUpdateHandlers = [];
  onEachUpdateHandlers = [];
  noNewBlockRetryInterval = 1000;
  pollingInterval = 5000;
  pollingHandle = null;
  firstPoll = true;
  latestBlock = null;
  ignoreUnchanged = true;
  previousState = {};

  constructor(preset, { block = 'latest' } = {}) {
    Object.assign(this.config, config.presets[preset]);
    const _block =
      block === 'latest' ? 'latest' : '0x' + Number(block).toString(16);
    Object.assign(this.config, { block: _block });
  }

  onUpdate(cb) {
    this.onUpdateHandlers.push(cb);
  }

  onEachUpdate(cb) {
    this.onEachUpdateHandlers.push(cb);
  }

  startPolling(interval = this.pollingInterval) {
    if (this.firstPoll === true) {
      interval = 0;
      this.firstPoll = false;
    }
    if (this.pollingHandle !== null) clearTimeout(this.pollingHandle);

    console.debug(`Polling with interval ${interval}ms`);
    this.pollingHandle = setTimeout(async () => {
      const [results, resultsUnfiltered] = await this.poll();
      const blockNumber = results.blockNumber;
      if (this.latestBlock !== null && blockNumber <= this.latestBlock) {
        this.startPolling(this.noNewBlockRetryInterval);
        return;
      }
      this.latestBlock = blockNumber;
      this.pollingHandle = null;

      if (this.onUpdateHandlers.length > 0)
        this.onUpdateHandlers.forEach(cb => cb(results));
      Object.keys(results).forEach(key => {
        if (
          this.previousState[key] !== undefined &&
          this.previousState[key] === resultsUnfiltered[key]
        )
          return;
        this.previousState[key] = resultsUnfiltered[key];
        if (this.onEachUpdateHandlers.length > 0)
          this.onEachUpdateHandlers.forEach(cb => cb(key, results[key]));
      });

      if (this.pollingHandle === null) this.startPolling();
    }, interval);
  }

  stopPolling() {
    if (this.pollingHandle !== null) clearTimeout(this.pollingHandle);
    this.firstPoll = true;
  }

  async poll() {
    const calls = this.registered.map(call =>
      this.templates[call.name](call.args)
    );
    const [results, resultsUnfiltered] = await this.aggregate(calls, { returnUnfiltered: true });

    // Template action handling
    let resultOffset = 1;
    calls.forEach(call => {
      if (typeof call.action === 'function') {
        const actionResultKeys = Object.keys(results).slice(
          resultOffset,
          resultOffset + call.returns.length
        );
        // Check if any result state is different
        let stateChange = false;
        for (let key of actionResultKeys) {
          if (this.previousState[key] !== resultsUnfiltered[key]) {
            stateChange = true;
            break;
          }
        }
        if (!stateChange) return;
        // Call template action
        const actionResults = actionResultKeys.reduce((acc, key) => {
          acc[key] = results[key];
          return acc;
        }, {});
        call.action(actionResults);
      }
      resultOffset += call.returns.length;
    });

    return [results, resultsUnfiltered];
  }

  registerTemplate(name, args) {
    this.registered.push({ name, args });
  }

  registerTemplates(templates) {
    templates.forEach(template =>
      this.registerTemplate(template[0], template[1] || undefined)
    );
  }

  createTemplate(name, cb) {
    this.templates[name] = args => cb({ ...this.globals, ...args });
  }

  createTemplates(templates) {
    for (const key of Object.keys(templates)) {
      this.createTemplate(key, templates[key]);
    }
  }

  setGlobal(key, value) {
    this.globals[key] = value;
  }

  setGlobals(fields) {
    this.globals = { ...this.globals, ...fields };
  }

  getGlobal(key) {
    return this.globals[key];
  }

  aggregate(calls, config) {
    return aggregate(calls, { ...this.config, ...config });
  }
}
