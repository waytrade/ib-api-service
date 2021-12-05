import {
  AccountSummariesUpdate,
  AccountSummaryTagValues,
  AccountSummaryValue,
  AccountSummaryValues,
  PnL
} from "@stoqey/ib";
import {MapExt} from "@waytrade/microservice-core";
import axios from "axios";
import {BehaviorSubject, ReplaySubject} from 'rxjs';
import WebSocket from "ws";
import {
  RealtimeDataMessage,
  RealtimeDataMessageType
} from "../../models/realtime-data-message.model";
import {IBApiApp} from "../ib-api-test-app";

describe("Test Real-time accountSummaries", () => {
  const TEST_USERNAME = "User" + Math.random();
  const TEST_PASSWORD = "Password" + Math.random();

  const app = new IBApiApp();

  let authToken = "";
  let streamEndpointUrl = "";
  let authenticatedStreamEndpointUrl = "";

  const TEST_ACCOUNT = "DU1233445";
  let TEST_NAV = Math.random();
  let TEST_TOTAL_CASH = Math.random();
  let TEST_REALIZED_PNL = Math.random();
  let TEST_UNREALIZED_PNL = Math.random();

  beforeAll(async () => {
    app.ibApiMock.managedAccounts.add(TEST_ACCOUNT);

    await app.start({
      SERVER_PORT: undefined,
      REST_API_USERNAME: TEST_USERNAME,
      REST_API_PASSWORD: TEST_PASSWORD,
    });

    streamEndpointUrl = `ws://localhost:${app.apiServerPort}/realtime/stream`;

    authToken = (
      await axios.post<void>(
        `http://127.0.0.1:${app.apiServerPort}/auth/password`,
        {
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        },
      )
    ).headers["authorization"] as string;

    authenticatedStreamEndpointUrl =
      streamEndpointUrl + `?auth=${encodeURI(authToken)}`;
  });

  afterAll(() => {
    app.stop();
  });

  test("Subscribe on 'accountSummary/'", async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(authenticatedStreamEndpointUrl);
      ws.onerror = err => {
        reject(err.message);
      };

      let messagesReceived = 0;

      const TEST_SUMMARIES = new MapExt<
        string,
        Map<string, AccountSummaryValues>
      >();

      function emitSummaryChange(
        account: string,
        values: AccountSummaryTagValues,
      ): void {
        const accountValues = TEST_SUMMARIES.getOrAdd(
          account,
          () => new Map<string, AccountSummaryValues>(),
        );
        values.forEach((v, k) => {
          accountValues.set(k, v);
        });

        app.ibApiMock.accountSummaryUpdate.next({
          all: TEST_SUMMARIES,
          changed: new Map<string, AccountSummaryTagValues>([
            [account, values],
          ]),
        });
      }

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: RealtimeDataMessageType.Subscribe,
            topic: "accountSummary/#",
          } as RealtimeDataMessage),
        );

        setTimeout(() => {
          emitSummaryChange(
            TEST_ACCOUNT,
            new Map<string, AccountSummaryValues>([
              [
                "NetLiquidation",
                new Map<string, AccountSummaryValue>([
                  [
                    app.config.BASE_CURRENCY ?? "",
                    {
                      value: "" + TEST_NAV,
                      ingressTm: Math.random(),
                    },
                  ],
                ]),
              ],
            ]),
          );
        }, 10);
      };

      ws.onmessage = event => {
        const msg = JSON.parse(event.data.toString()) as RealtimeDataMessage;
        switch (messagesReceived) {
          case 0: {
            expect(msg.topic).toEqual("accountSummary/" + TEST_ACCOUNT);
            expect(msg.data?.accountSummary?.baseCurrency).toEqual(
              app.config.BASE_CURRENCY,
            );
            expect(msg.data?.accountSummary?.account).toEqual(TEST_ACCOUNT);
            expect(msg.data?.accountSummary?.netLiquidation).toEqual(TEST_NAV);

            ws.send(
              JSON.stringify({
                type: RealtimeDataMessageType.Unsubscribe,
                topic: "accountSummary/#",
              } as RealtimeDataMessage),
            );

            setTimeout(() => {
              ws.send(
                JSON.stringify({
                  type: RealtimeDataMessageType.Subscribe,
                  topic: "accountSummary/",
                } as RealtimeDataMessage),
              );
            }, 50)
            break;
          }

          case 1: {
            expect(msg.topic).toEqual("accountSummary/");
            expect(msg.error?.desc).toEqual(
              "invalid topic, account argument missing",
            );


            ws.send(
              JSON.stringify({
                type: RealtimeDataMessageType.Subscribe,
                topic: "accountSummary/" + TEST_ACCOUNT,
              } as RealtimeDataMessage),
            );

            break;
          }

          case 2: {
            expect(msg.topic).toEqual("accountSummary/" + TEST_ACCOUNT);
            expect(msg.data?.accountSummary?.baseCurrency).toEqual(
              app.config.BASE_CURRENCY,
            );
            expect(msg.data?.accountSummary?.account).toEqual(TEST_ACCOUNT);
            expect(msg.data?.accountSummary?.netLiquidation).toEqual(TEST_NAV);

            TEST_TOTAL_CASH = Math.random();

            app.ibApiMock.accountSummaryUpdate.error({
              error: {
                message: "accountSummary Test Error",
              },
            });

            setTimeout(() => {
              app.ibApiMock.accountSummaryUpdate = new ReplaySubject<AccountSummariesUpdate>(1);
              emitSummaryChange(
                TEST_ACCOUNT,
                new Map<string, AccountSummaryValues>([
                  [
                    "TotalCashValue",
                    new Map<string, AccountSummaryValue>([
                      [
                        app.config.BASE_CURRENCY ?? "",
                        {
                          value: "" + TEST_TOTAL_CASH,
                          ingressTm: Math.random(),
                        },
                      ],
                    ]),
                  ],
                ]),
              );
            }, 100);

            break;
          }

          case 3: {
            expect(msg.topic).toEqual("accountSummary/" + TEST_ACCOUNT);
            expect(msg.data?.accountSummary?.totalCashValue).toEqual(
              TEST_TOTAL_CASH,
            );

            app.ibApiMock.currentPnL.error({
              error: {
                message: "accountSummary Test Error",
              },
            });

            TEST_REALIZED_PNL = Math.random();
            TEST_UNREALIZED_PNL = Math.random();

            setTimeout(() => {
              app.ibApiMock.currentPnL = new BehaviorSubject<PnL>({
                realizedPnL: TEST_REALIZED_PNL,
                unrealizedPnL: TEST_UNREALIZED_PNL,
              });
            }, 100);

            break;
          }

          case 4: {
            expect(msg.topic).toEqual("accountSummary/" + TEST_ACCOUNT);
            expect(msg.data?.accountSummary?.account).toEqual(TEST_ACCOUNT);
            expect(msg.data?.accountSummary?.realizedPnL).toEqual(
              TEST_REALIZED_PNL,
            );
            expect(msg.data?.accountSummary?.unrealizedPnL).toEqual(
              TEST_UNREALIZED_PNL,
            );

            TEST_TOTAL_CASH = Math.random()

            emitSummaryChange(
              TEST_ACCOUNT,
              new Map<string, AccountSummaryValues>([
                [
                  "TotalCashValue",
                  new Map<string, AccountSummaryValue>([
                    [
                      app.config.BASE_CURRENCY ?? "",
                      {
                        value: "" + TEST_TOTAL_CASH,
                        ingressTm: Math.random(),
                      },
                    ],
                  ]),
                ],
              ]),
            );

            break;
          }

          case 5: {
            expect(msg.topic).toEqual("accountSummary/" + TEST_ACCOUNT);
            expect(msg.data?.accountSummary?.account).toEqual(TEST_ACCOUNT);
            expect(msg.data?.accountSummary?.totalCashValue).toEqual(TEST_TOTAL_CASH);

            ws.send(
              JSON.stringify({
                type: RealtimeDataMessageType.Unsubscribe,
                topic: "accountSummary/" + TEST_ACCOUNT,
              } as RealtimeDataMessage),
            );

            setTimeout(() => {
              emitSummaryChange(
                TEST_ACCOUNT,
                new Map<string, AccountSummaryValues>([
                  [
                    "SettledCash",
                    new Map<string, AccountSummaryValue>([
                      [
                        app.config.BASE_CURRENCY ?? "",
                        {
                          value: "" + Math.random(),
                          ingressTm: Math.random(),
                        },
                      ],
                    ]),
                  ],
                ]),
              );
              setTimeout(() => {
                resolve();
              }, 50);
            }, 10);

            break;
          }

          default:
            ws.close();
            reject();

            break;
        }

        messagesReceived++;
      };
    });
  });
});
