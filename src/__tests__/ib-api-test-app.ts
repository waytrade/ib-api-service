import {IBApiNext} from "@stoqey/ib";
import path from "path";
import * as App from "../app";
import {IBApiNextMock} from "./mock/ib-api-next.mock";

/** IBApiApp with mocked IBApiNext */
export class IBApiApp extends App.IBApiApp {
  constructor() {
    super(path.resolve(__dirname, "../.."));
  }
  /** Called when the app shall boot up. */
  protected async boot(): Promise<void> {
    this.info(`Booting ib-api-service mock at port ${this.config.SERVER_PORT}`);
    this._ibApi = <IBApiNext>(<unknown>new IBApiNextMock());
  }
}
