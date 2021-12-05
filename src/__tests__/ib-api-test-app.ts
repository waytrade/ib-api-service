import {IBApiNext} from '@stoqey/ib';
import {DefaultMicroserviceComponentFactory} from '@waytrade/microservice-core';
import {Subject} from "rxjs";
import * as App from "../app";
import {IBApiNextMock} from "./mock/ib-api-next.mock";

const ibApiNetMock = new IBApiNextMock()

class IBApiFactoryServiceMock {
  get api(): Promise<IBApiNext> {
    return new Promise<IBApiNext>(resolve => resolve(<unknown>ibApiNetMock as IBApiNext));
  }
}

class MockComponentFactory extends DefaultMicroserviceComponentFactory {
  create(type: unknown): unknown {
    if ((<any>type).name === "IBApiFactoryService") {
      return new IBApiFactoryServiceMock()
    }
    return super.create(type)
  }
}

/** IBApiApp with mocked IBApiNext */
export class IBApiApp extends App.IBApiApp {
  constructor(mockIbApi = true) {
    super(mockIbApi ? new MockComponentFactory() : new DefaultMicroserviceComponentFactory());
  }

  readonly appStopped = new Subject<void>();

  get ibApiMock(): IBApiNextMock {
    return ibApiNetMock
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
