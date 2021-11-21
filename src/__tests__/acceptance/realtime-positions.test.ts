import {
  AccountPositionsUpdate,
  IBApiNextError,
  PnLSingle,
  Position,
} from "@stoqey/ib";
import axios from "axios";
import {ReplaySubject} from "rxjs";
import WebSocket from "ws";
import {
  RealtimeDataMessage,
  RealtimeDataMessageType,
} from "../../models/realtime-data-message.model";
import {IBApiApp} from "../ib-api-test-app";

describe("Test Real-time positions", () => {
  const TEST_USERNAME = "User" + Math.random();
  const TEST_PASSWORD = "Password" + Math.random();

  const app = new IBApiApp();

  let authToken = "";
  let streamEndpointUrl = "";
  let authenticatedStreamEndpointUrl = "";

  beforeAll(async () => {
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

  test("Subscribe on 'positions'", async () => {
    return new Promise<void>((resolve, reject) => {
      const accountId = "Account" + Math.random();

      const POSITION0: Position = {
        account: accountId,
        pos: Math.random(),
        avgCost: Math.random(),
        contract: {
          conId: Math.random(),
        },
      };
      const POSITION0_ID = POSITION0.account + ":" + POSITION0.contract.conId;

      const POSITION1: Position = {
        account: accountId,
        pos: Math.random(),
        avgCost: Math.random(),
        contract: {
          conId: Math.random(),
        },
      };
      const POSITION1_ID = POSITION1.account + ":" + POSITION1.contract.conId;

      const POSITION2: Position = {
        account: accountId,
        pos: Math.random(),
        avgCost: Math.random(),
        contract: {
          conId: Math.random(),
        },
      };
      const POSITION2_ID = POSITION2.account + ":" + POSITION2.contract.conId;

      const ZERO_POSITION: Position = {
        account: accountId,
        pos: 0,
        avgCost: Math.random(),
        contract: {
          conId: Math.random(),
        },
      };

      const POSITIONS: Position[] = [
        POSITION0,
        POSITION1,
        POSITION2,
        ZERO_POSITION,
      ];

      const positionsMap = new Map<string, Position[]>();
      positionsMap.set(accountId, POSITIONS);

      app.ibApiMock.currentPositionsUpdate.next({
        all: positionsMap,
        added: positionsMap,
      });

      let PNL: PnLSingle = {
        position: POSITION0.pos,
        marketValue: Math.random(),
        dailyPnL: Math.random(),
        unrealizedPnL: Math.random(),
        realizedPnL: Math.random(),
      };

      app.ibApiMock.currentPnLSingle.next(PNL);

      let messagesReceived = 0;

      const ws = new WebSocket(authenticatedStreamEndpointUrl);
      ws.onerror = err => {
        reject(err.message);
      };

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: RealtimeDataMessageType.Subscribe,
            topic: "position/",
          } as RealtimeDataMessage),
        );
      };

      ws.onmessage = event => {
        const msg = JSON.parse(event.data.toString()) as RealtimeDataMessage;

        switch (messagesReceived) {
          case 0:
            expect(msg.topic).toBe("position/");
            expect(msg.error?.desc).toEqual(
              "invalid topic, only 'position/#' wildcard supported",
            );

            ws.send(
              JSON.stringify({
                type: RealtimeDataMessageType.Subscribe,
                topic: "position/#",
              } as RealtimeDataMessage),
            );
            break;
          case 1:
            expect(msg.topic).toBe("position/" + POSITION0_ID);
            expect(msg.data?.position?.account).toEqual(POSITION0.account);
            expect(msg.data?.position?.pos).toEqual(POSITION0.pos);
            expect(msg.data?.position?.conId).toEqual(POSITION0.contract.conId);
            break;
          case 2:
            expect(msg.topic).toBe("position/" + POSITION1_ID);
            expect(msg.data?.position?.account).toEqual(POSITION1.account);
            expect(msg.data?.position?.pos).toEqual(POSITION1.pos);
            expect(msg.data?.position?.conId).toEqual(POSITION1.contract.conId);
            break;
          case 3:
            expect(msg.topic).toBe("position/" + POSITION2_ID);
            expect(msg.data?.position?.account).toEqual(POSITION2.account);
            expect(msg.data?.position?.pos).toEqual(POSITION2.pos);
            expect(msg.data?.position?.conId).toEqual(POSITION2.contract.conId);
            break;
          case 4:
            expect(msg.topic).toBe("position/" + POSITION0_ID);
            expect(msg.data?.position?.marketValue).toEqual(PNL.marketValue);
            expect(msg.data?.position?.dailyPnL).toEqual(PNL.dailyPnL);
            expect(msg.data?.position?.unrealizedPnL).toEqual(
              PNL.unrealizedPnL,
            );
            expect(msg.data?.position?.realizedPnL).toEqual(PNL.realizedPnL);
            break;
          case 5:
            expect(msg.topic).toBe("position/" + POSITION1_ID);
            expect(msg.data?.position?.marketValue).toEqual(PNL.marketValue);
            expect(msg.data?.position?.dailyPnL).toEqual(PNL.dailyPnL);
            expect(msg.data?.position?.unrealizedPnL).toEqual(
              PNL.unrealizedPnL,
            );
            expect(msg.data?.position?.realizedPnL).toEqual(PNL.realizedPnL);
            break;
          case 6:
            expect(msg.topic).toBe("position/" + POSITION2_ID);
            expect(msg.data?.position?.marketValue).toEqual(PNL.marketValue);
            expect(msg.data?.position?.dailyPnL).toEqual(PNL.dailyPnL);
            expect(msg.data?.position?.unrealizedPnL).toEqual(
              PNL.unrealizedPnL,
            );
            expect(msg.data?.position?.realizedPnL).toEqual(PNL.realizedPnL);

            // single PnL errors must not chancel the subscription
            app.ibApiMock.currentPnLSingle.error({
              error: {message: "Test error"},
            } as IBApiNextError);
            // position update error must cancel the subscription
            app.ibApiMock.currentPositionsUpdate.error({
              error: {message: "Test error"},
            } as IBApiNextError);
            break;
          case 7:
            expect(msg.topic).toBe("position/#");
            expect(msg.error?.desc).toEqual("getPositions(): Test error");

            // must not trigger an update as subscription has terminated with an error
            PNL = {
              marketValue: Math.random(),
              dailyPnL: Math.random(),
              unrealizedPnL: Math.random(),
              realizedPnL: Math.random(),
            };
            app.ibApiMock.currentPnLSingle.next(PNL);

            setTimeout(() => {
              // clear the error on the subjects
              app.ibApiMock.currentPositionsUpdate =
                new ReplaySubject<AccountPositionsUpdate>(1);
              app.ibApiMock.currentPositionsUpdate.next({
                all: positionsMap,
                added: positionsMap,
              });
              app.ibApiMock.currentPnLSingle = new ReplaySubject<PnLSingle>(1);
              app.ibApiMock.currentPnLSingle.next(PNL);

              ws.send(
                JSON.stringify({
                  type: RealtimeDataMessageType.Subscribe,
                  topic: "position/#",
                } as RealtimeDataMessage),
              );
            }, 10);
            break;
          case 8:
            expect(msg.topic).toBe("position/" + POSITION0_ID);
            expect(msg.data?.position?.account).toEqual(POSITION0.account);
            expect(msg.data?.position?.pos).toEqual(POSITION0.pos);
            expect(msg.data?.position?.conId).toEqual(POSITION0.contract.conId);
            break;
          case 9:
            expect(msg.topic).toBe("position/" + POSITION1_ID);
            expect(msg.data?.position?.account).toEqual(POSITION1.account);
            expect(msg.data?.position?.pos).toEqual(POSITION1.pos);
            expect(msg.data?.position?.conId).toEqual(POSITION1.contract.conId);
            break;
          case 10:
            expect(msg.topic).toBe("position/" + POSITION2_ID);
            expect(msg.data?.position?.account).toEqual(POSITION2.account);
            expect(msg.data?.position?.pos).toEqual(POSITION2.pos);
            expect(msg.data?.position?.conId).toEqual(POSITION2.contract.conId);
            break;
          case 11:
            expect(msg.topic).toBe("position/" + POSITION0_ID);
            expect(msg.data?.position?.marketValue).toEqual(PNL.marketValue);
            expect(msg.data?.position?.dailyPnL).toEqual(PNL.dailyPnL);
            expect(msg.data?.position?.unrealizedPnL).toEqual(
              PNL.unrealizedPnL,
            );
            expect(msg.data?.position?.realizedPnL).toEqual(PNL.realizedPnL);
            break;
          case 12:
            expect(msg.topic).toBe("position/" + POSITION1_ID);
            expect(msg.data?.position?.marketValue).toEqual(PNL.marketValue);
            expect(msg.data?.position?.dailyPnL).toEqual(PNL.dailyPnL);
            expect(msg.data?.position?.unrealizedPnL).toEqual(
              PNL.unrealizedPnL,
            );
            expect(msg.data?.position?.realizedPnL).toEqual(PNL.realizedPnL);
            break;
          case 13:
            expect(msg.topic).toBe("position/" + POSITION2_ID);
            expect(msg.data?.position?.marketValue).toEqual(PNL.marketValue);
            expect(msg.data?.position?.dailyPnL).toEqual(PNL.dailyPnL);
            expect(msg.data?.position?.unrealizedPnL).toEqual(
              PNL.unrealizedPnL,
            );
            expect(msg.data?.position?.realizedPnL).toEqual(PNL.realizedPnL);

            PNL = {
              position: Math.random(),
            };
            app.ibApiMock.currentPnLSingle.next(PNL);
            break;

          case 14:
            expect(msg.topic).toBe("position/" + POSITION0_ID);
            expect(msg.data?.position?.pos).toEqual(PNL.position);
            break;

          case 15:
            expect(msg.topic).toBe("position/" + POSITION1_ID);
            expect(msg.data?.position?.pos).toEqual(PNL.position);
            break;

          case 16:
            expect(msg.topic).toBe("position/" + POSITION2_ID);
            expect(msg.data?.position?.pos).toEqual(PNL.position);

            positionsMap.set(accountId, POSITIONS);
            Object.assign(POSITION0, {avgCost: Math.random()});
            app.ibApiMock.currentPositionsUpdate.next({
              all: positionsMap,
              changed: new Map<string, Position[]>([[accountId, [POSITION0]]]),
            });
            break;

          case 17:
            expect(msg.topic).toBe("position/" + POSITION0_ID);
            expect(msg.data?.position?.avgCost).toEqual(POSITION0.avgCost);

            // must not trigger any extra event as no changed attributes
            app.ibApiMock.currentPnLSingle.next(PNL);

            app.ibApiMock.currentPositionsUpdate.next({
              all: new Map<string, Position[]>(),
              removed: new Map<string, Position[]>([
                [POSITION0.account, [POSITION0]],
              ]),
            });
            break;

          case 18:
            expect(msg.type).toBe(RealtimeDataMessageType.Unpublish);
            expect(msg.topic).toBe("position/" + POSITION0_ID);

            PNL = {
              position: 0, // zero size positions
            };
            app.ibApiMock.currentPnLSingle.next(PNL);
            break;

          case 19:
            expect(msg.type).toBe(RealtimeDataMessageType.Unpublish);
            expect(msg.topic).toBe("position/" + POSITION1_ID);
            break;

          case 20:
            expect(msg.type).toBe(RealtimeDataMessageType.Unpublish);
            expect(msg.topic).toBe("position/" + POSITION2_ID);

            PNL = {
              position: 3,
            };
            app.ibApiMock.currentPnLSingle.next(PNL);
            break;

          case 21:
            expect(msg.topic).toBe("position/" + POSITION1_ID);
            expect(msg.data?.position?.pos).toEqual(PNL.position);
            break;

          case 22:
            expect(msg.topic).toBe("position/" + POSITION2_ID);
            expect(msg.data?.position?.pos).toEqual(PNL.position);

            Object.assign(POSITION2, {avgCost: Math.random()});
            app.ibApiMock.currentPositionsUpdate.next({
              all: positionsMap,
              changed: new Map<string, Position[]>([[accountId, [POSITION2]]]),
            });
            break;

          case 23:
            expect(msg.topic).toBe("position/" + POSITION2_ID);
            expect(msg.data?.position?.avgCost).toBe(POSITION2.avgCost);

            Object.assign(POSITION2, {pos: 0});
            app.ibApiMock.currentPositionsUpdate.next({
              all: positionsMap,
              changed: new Map<string, Position[]>([[accountId, [POSITION2]]]),
            });
            break;

          case 24:
            expect(msg.type).toBe(RealtimeDataMessageType.Unpublish);
            expect(msg.topic).toBe("position/" + POSITION2_ID);

            resolve();

            break;
        }

        messagesReceived++;
      };
    });
  });
});
