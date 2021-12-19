import {SubscriberHandler} from "./subscriberHandler.js";
export var LogLevel;
(function(LogLevel2) {
  LogLevel2["error"] = `error`;
  LogLevel2["warn"] = `warn`;
  LogLevel2["info"] = `info`;
})(LogLevel || (LogLevel = {}));
export class LogHandler {
  constructor() {
    this.logObservable = new SubscriberHandler();
  }
  log(level, message) {
    this.logObservable.next({level, message});
  }
}
