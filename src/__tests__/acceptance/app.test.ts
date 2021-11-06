import {HttpStatus} from "@waytrade/microservice-core";
import axios from "axios";
import {filter, firstValueFrom} from "rxjs";
import {sleep} from "../helper/test.helper";
import {IBApiApp} from "../ib-api-test-app";
/**
 * App test code.
 */
describe("Test App", () => {
  test("App boot", () => {
    return new Promise<void>(async (resolve, reject) => {
      const app = new IBApiApp();
      app
        .start({
          SERVER_PORT: undefined,
        })
        .then(() => {
          axios
            .get<unknown>(`http://127.0.0.1:${app.apiServerPort}/`)
            .then(response => {
              expect(response.status).toEqual(HttpStatus.OK);
              app.stop();
              resolve();
            })
            .catch(error => {
              reject(error);
            });
        })
        .catch(e => {
          reject(e);
        });
    });
  });

  test("Proxy IBApiNext log to App Context", async () => {
    let logsReceived = 0;

    const app = new IBApiApp();
    await app.start({
      LOG_LEVEL: "debug",
      SERVER_PORT: undefined,
    });
    firstValueFrom(
      app.debugLog.pipe(
        filter(v => v === "[Test] This is a debug log message"),
      ),
    ).then(() => logsReceived++);
    app.ibApi.logger?.debug("Test", "This is a debug log message");
    app.stop();

    await app.start({
      LOG_LEVEL: "info",
      SERVER_PORT: undefined,
    });
    firstValueFrom(
      app.infoLog.pipe(filter(v => v === "[Test] This is a info log message")),
    ).then(() => logsReceived++);
    app.ibApi.logger?.info("Test", "This is a info log message");
    app.stop();

    await app.start({
      LOG_LEVEL: "warn",
      SERVER_PORT: undefined,
    });
    firstValueFrom(
      app.warnLog.pipe(filter(v => v === "[Test] This is a warn log message")),
    ).then(() => logsReceived++);
    app.ibApi.logger?.warn("Test", "This is a warn log message");
    app.stop();

    await app.start({
      LOG_LEVEL: "error",
      SERVER_PORT: undefined,
    });
    firstValueFrom(
      app.errorLog.pipe(
        filter(v => v === "[Test] This is an error log message"),
      ),
    ).then(() => logsReceived++);
    app.ibApi.logger?.error("Test", "This is an error log message");
    app.stop();

    await sleep(100);
    expect(logsReceived).toEqual(4);
  });

  test("App boot (no IB_GATEWAY_PORT)", () => {
    return new Promise<void>(async (resolve, reject) => {
      const app = new IBApiApp();
      app
        .start({
          SERVER_PORT: undefined,
          IB_GATEWAY_PORT: undefined,
        })
        .then(() => {
          reject();
        })
        .catch((e: Error) => {
          expect(e.message).toEqual("IB_GATEWAY_PORT not configured.");
          resolve();
        })
        .finally(() => {
          app.stop();
        });
    });
  });

  test("App boot (no IB_GATEWAY_HOST )", () => {
    return new Promise<void>(async (resolve, reject) => {
      const app = new IBApiApp();
      app
        .start({
          SERVER_PORT: undefined,
          IB_GATEWAY_HOST: undefined,
        })
        .then(() => {
          reject();
        })
        .catch((e: Error) => {
          expect(e.message).toEqual("IB_GATEWAY_HOST not configured.");
          resolve();
        })
        .finally(() => {
          app.stop();
        });
    });
  });

  test("App shutdown on connection loss", () => {
    return new Promise<void>(async (resolve, reject) => {
      const app = new IBApiApp();
      app
        .start({
          SERVER_PORT: undefined,
          IB_GATEWAY_RECONNECT_TRIES: 2,
        })
        .then(() => {
          firstValueFrom(app.appStopped).then(() => resolve());
          sleep(3000).then(() => {
            app.ibApi.disconnect(); // connecton lost
            app.ibApi.connect(); // 1st re-connect try
            app.ibApi.disconnect(); // connecton lost
            app.ibApi.connect(); // 2nd re-connect try
            app.ibApi.disconnect(); // connecton lost: must exit now
          });
        })
        .catch(e => {
          reject(e);
        });
    });
  });
});
