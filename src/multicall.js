import aggregate from './aggregate';
import config from './config.json';
import { clearTimeout } from 'timers';

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

    console.log(`Polling with interval ${interval}ms`);
    this.pollingHandle = setTimeout(async () => {
      const results = await this.poll();
      if (results === null) {
        this.startPolling(this.noNewBlockRetryInterval);
        return;
      }
      this.pollingHandle = null;

      if (this.onUpdateHandlers.length > 0)
        this.onUpdateHandlers.forEach(cb => cb(results));
      Object.keys(results).forEach(key => {
        if (
          typeof this.previousState[key] !== 'undefined' &&
          this.previousState[key] === results[key]
        )
          return;
        this.previousState[key] = results[key];
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
    return await this.aggregate(calls);
  }
  registerTemplate(name, args) {
    // if (args.ignoreUnchanged === true) {
    //   delete args.ignoreUnchanged;
    // }
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
  aggregate(calls) {
    return aggregate(calls, this.config);
  }
}
