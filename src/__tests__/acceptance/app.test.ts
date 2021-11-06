import {HttpStatus} from "@waytrade/microservice-core";
import axios from "axios";
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

  /*
  test("App boot (no IDENTITY_SERVICE_URL)", async () => {
    return new Promise<void>(async (resolve, reject) => {
      const app = new ApiGatewayApp();
      app
        .start({
          SERVER_PORT: undefined,
          IDENTITY_SERVICE_URL: undefined,
        })
        .then(() => {
          reject();
        })
        .catch(() => {
          resolve();
        })
        .finally(() => {
          app.stop();
        });
    });
  });*/
});
