import {Subject} from "rxjs";
import * as App from "../app";
import {IBApiNextMock} from "./mock/ib-api-next.mock";

/** IBApiApp with mocked IBApiNext */
export class IBApiApp extends App.IBApiApp {
  constructor() {
    super(IBApiNextMock);
  }

  readonly appStopped = new Subject<void>();

  get ibApiMock(): IBApiNextMock {
    return <IBApiNextMock>(<unknown>this.ibApi);
  }

  /** Stop the app. */
  stop(): void {
    super.stop();
    this.appStopped.next();
  }

  readonly debugLog = new Subject<string>();

  debug(msg: string, ...args: unknown[]): void {
    this.debugLog.next(msg);
  }

  readonly infoLog = new Subject<string>();

  info(msg: string, ...args: unknown[]): void {
    this.infoLog.next(msg);
  }

  readonly warnLog = new Subject<string>();

  warn(msg: string, ...args: unknown[]): void {
    this.warnLog.next(msg);
  }

  readonly errorLog = new Subject<string>();

  error(msg: string, ...args: unknown[]): void {
    this.errorLog.next(msg);
  }
}
