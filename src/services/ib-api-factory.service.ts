import * as IB from "@stoqey/ib";
import {inject, service} from "@waytrade/microservice-core";
import {firstValueFrom, ReplaySubject} from "rxjs";
import {IBApiApp} from "../app";
import {IBApiLoggerProxy} from "../utils/ib-api-logger-proxy";


/**
 * IBApiNext factory service.
 */
@service()
export class IBApiFactoryService {
  @inject("IBApiApp")
  private app!: IBApiApp;

  /** The [[IBApiNext]] instance subject. */
  private _api = new ReplaySubject<IB.IBApiNext>(1);


  /** Start the service. */
  start(): void {
    if (!this.app.config.IB_GATEWAY_PORT) {
      throw Error("IB_GATEWAY_PORT not configured.");
    }
    if (!this.app.config.IB_GATEWAY_HOST) {
      throw Error("IB_GATEWAY_HOST not configured.");
    }

    const ibApi = new IB.IBApiNext({
      port: this.app.config.IB_GATEWAY_PORT,
      host: this.app.config.IB_GATEWAY_HOST,
      logger: new IBApiLoggerProxy(this.app),
      connectionWatchdogInterval: 30,
      reconnectInterval: 5000,
    });

    switch (this.app.config.LOG_LEVEL) {
      case "debug":
        ibApi.logLevel = IB.LogLevel.DETAIL;
        break;
      case "info":
        ibApi.logLevel = IB.LogLevel.INFO;
        break;
      case "warn":
        ibApi.logLevel = IB.LogLevel.WARN;
        break;
      case "error":
        ibApi.logLevel = IB.LogLevel.ERROR;
        break;
    }

    ibApi.connect(0);

    this._api.next(ibApi);
  }

  /** Stop the service. */
  stop(): void {
    this.api.then((p) => p.disconnect());
  }

  get api():  Promise<IB.IBApiNext> {
    return firstValueFrom(this._api);
  }
 }
