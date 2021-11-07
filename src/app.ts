import * as IB from "@stoqey/ib";
import {MicroserviceApp} from "@waytrade/microservice-core";
import path from "path";
import {Subscription} from "rxjs";
import {IBApiServiceConfig} from "./config";
import {AccountController} from "./controllers/account.controller";
import {AuthenticatonController} from "./controllers/authentication.controller";
import {ContractsController} from "./controllers/contracts.controller";
import {AuthenticationService} from "./services/authentication.service";
import {IBApiService} from "./services/ib-api.service";
import {IBApiLoggerProxy} from "./utils/ib-api-logger-proxy";

/**
 * The Interactive Brokers TWS API service App.
 */
export class IBApiApp extends MicroserviceApp<IBApiServiceConfig> {
  constructor(private IBApiNextConstructable: unknown = IB.IBApiNext) {
    super(path.resolve(__dirname, ".."), {
      apiControllers: [
        AuthenticatonController,
        ContractsController,
        AccountController,
      ],
      services: [AuthenticationService, IBApiService],
    });
  }

  /** The [[IBApiNext]] instance. */
  private _ibApi!: IB.IBApiNext;

  /** Subscription on IBApiNext connection date. */
  private connectionState$?: Subscription;

  /** Get the [[IBApiNext]] instance. */
  get ibApi(): IB.IBApiNext {
    return this._ibApi;
  }

  /** Called when the app shall boot up. */
  protected async boot(): Promise<void> {
    this.info(`Booting ib-api-service at port ${this.config.SERVER_PORT}`);
    try {
      this.initIBApiNext();
    } catch (e) {
      this.error((<Record<string, string>>e).message);
      throw e;
    }
    this.info(`IB Gateway host: ${this.config.IB_GATEWAY_HOST}`);
    this.info(`IB Gateway port: ${this.config.IB_GATEWAY_PORT}`);
  }

  /** Called when the microservice has been started. */
  onStarted(): void {
    this.info(`ib-api-service is running at port ${this.config.SERVER_PORT}`);
  }

  /** Stop the app. */
  stop(): void {
    this.connectionState$?.unsubscribe();
    this._ibApi?.disconnect();
    super.stop();
  }

  /** Initialize the IBApiNext. */
  private initIBApiNext(): void {
    if (!this.config.IB_GATEWAY_PORT) {
      throw new Error("IB_GATEWAY_PORT not configured.");
    }

    if (!this.config.IB_GATEWAY_HOST) {
      throw new Error("IB_GATEWAY_HOST not configured.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._ibApi = new (<any>this.IBApiNextConstructable)({
      port: this.config.IB_GATEWAY_PORT,
      host: this.config.IB_GATEWAY_HOST,
      logger: new IBApiLoggerProxy(this),
      connectionWatchdogInterval: 30,
      reconnectInterval: 5000,
    });

    switch (this.config.LOG_LEVEL) {
      case "debug":
        this._ibApi.logLevel = IB.LogLevel.DETAIL;
        break;
      case "info":
        this._ibApi.logLevel = IB.LogLevel.INFO;
        break;
      case "warn":
        this._ibApi.logLevel = IB.LogLevel.WARN;
        break;
      case "error":
        this._ibApi.logLevel = IB.LogLevel.ERROR;
        break;
    }

    // exit on connection loss

    let connectionTries = 0;
    let connectedTimer: NodeJS.Timeout;

    this.connectionState$ = this._ibApi.connectionState.subscribe({
      next: state => {
        switch (state) {
          case IB.ConnectionState.Connecting:
            connectionTries++;
            break;
          case IB.ConnectionState.Connected:
            if (connectedTimer) {
              clearTimeout(connectedTimer);
            }
            connectedTimer = global.setTimeout(() => {
              connectionTries = 0;
            }, 2000); // wait 2s to ensure a stable connection before resetting connectionTries
            break;
          case IB.ConnectionState.Disconnected:
            if (connectedTimer) {
              clearTimeout(connectedTimer);
            }
            if (
              connectionTries >= (this.config.IB_GATEWAY_RECONNECT_TRIES ?? 0)
            ) {
              this.error("Lost connection to IB Gateway, shutown app...");
              this.stop();
            }
            break;
        }
      },
    });

    // connect to IB Gateway

    this._ibApi.connect(0);
  }
}
