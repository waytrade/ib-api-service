import {
  AccountPositionsUpdate,
  IBApiNextError,
  PnLSingle,
  Position
} from "@stoqey/ib";
import axios from "axios";
import {BehaviorSubject, ReplaySubject} from "rxjs";
import WebSocket from "ws";
import {
  RealtimeDataMessage,
  RealtimeDataMessageType
} from "../../models/realtime-data-message.model";
import {IBApiApp} from "../ib-api-test-app";

describe("Test Real-time positions", () => {
  const TEST_USERNAME = "User" + Math.random();
  const TEST_PASSWORD = "Password" + Math.random();

  let authToken = "";
  let streamEndpointUrl = "";
  let authenticatedStreamEndpointUrl = "";

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
    pos: Math.random() + 10,
    avgCost: Math.random() + 10,
    contract: {
      conId: Math.random(),
    },
  };
  const POSITION1_ID = POSITION1.account + ":" + POSITION1.contract.conId;

  const POSITION2: Position = {
    account: accountId,
    pos: Math.random()  + 100,
    avgCost: Math.random() + 100,
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

  const app = new IBApiApp();
  app.ibApiMock.currentPositionsUpdate.next({
    all: positionsMap,
    added: positionsMap,
  });


  let PNL0: PnLSingle = {
    position: POSITION0.pos,
    marketValue: Math.random(),
    dailyPnL: Math.random(),
    unrealizedPnL: Math.random(),
    realizedPnL: Math.random(),
  };
  let PNL1: PnLSingle = {
    position: POSITION1.pos,
    marketValue: Math.random(),
    dailyPnL: Math.random(),
    unrealizedPnL: Math.random(),
    realizedPnL: Math.random(),
  };
  let PNL2: PnLSingle = {
    position: POSITION2.pos,
    marketValue: Math.random(),
    dailyPnL: Math.random(),
    unrealizedPnL: Math.random(),
    realizedPnL: Math.random(),
  };

  app.ibApiMock.currentPnLSingle.set(
    POSITION0.contract.conId??0,
    new BehaviorSubject<PnLSingle>(PNL0)
  );
  app.ibApiMock.currentPnLSingle.set(
    POSITION1.contract.conId??0,
    new BehaviorSubject<PnLSingle>(PNL1)
  );
  app.ibApiMock.currentPnLSingle.set(
    POSITION2.contract.conId??0,
    new BehaviorSubject<PnLSingle>(PNL2)
  );

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
            expect(msg.data?.position?.avgCost).toEqual(POSITION0.avgCost);
            expect(msg.data?.position?.marketValue).toEqual(PNL0.marketValue);
            expect(msg.data?.position?.dailyPnL).toEqual(PNL0.dailyPnL);
            expect(msg.data?.position?.unrealizedPnL).toEqual(
              PNL0.unrealizedPnL,
            );
            expect(msg.data?.position?.realizedPnL).toEqual(PNL0.realizedPnL);
            break;
          case 2:
            expect(msg.topic).toBe("position/" + POSITION1_ID);
            expect(msg.data?.position?.account).toEqual(POSITION1.account);
            expect(msg.data?.position?.pos).toEqual(POSITION1.pos);
            expect(msg.data?.position?.conId).toEqual(POSITION1.contract.conId);
            expect(msg.data?.position?.avgCost).toEqual(POSITION1.avgCost);
            expect(msg.data?.position?.marketValue).toEqual(PNL1.marketValue);
            expect(msg.data?.position?.dailyPnL).toEqual(PNL1.dailyPnL);
            expect(msg.data?.position?.unrealizedPnL).toEqual(
              PNL1.unrealizedPnL,
            );
            expect(msg.data?.position?.realizedPnL).toEqual(PNL1.realizedPnL);
            break;
          case 3:
            expect(msg.topic).toBe("position/" + POSITION2_ID);
            expect(msg.data?.position?.account).toEqual(POSITION2.account);
            expect(msg.data?.position?.pos).toEqual(POSITION2.pos);
            expect(msg.data?.position?.conId).toEqual(POSITION2.contract.conId);
            expect(msg.data?.position?.avgCost).toEqual(POSITION2.avgCost);
            expect(msg.data?.position?.marketValue).toEqual(PNL2.marketValue);
            expect(msg.data?.position?.dailyPnL).toEqual(PNL2.dailyPnL);
            expect(msg.data?.position?.unrealizedPnL).toEqual(
              PNL2.unrealizedPnL,
            );
            expect(msg.data?.position?.realizedPnL).toEqual(PNL2.realizedPnL);

            app.ibApiMock.currentPositionsUpdate.error({
              error: {message: "Test error"},
            } as IBApiNextError);

            setTimeout(() => {
              // clear the error on the subjects
              app.ibApiMock.currentPositionsUpdate =
                new ReplaySubject<AccountPositionsUpdate>(1);
              app.ibApiMock.currentPositionsUpdate.next({
                all: positionsMap,
                added: positionsMap,
              });

              PNL0 = {
                position: Math.random(),
              };
              app.ibApiMock.currentPnLSingle.get(
                POSITION0.contract.conId??0)?.next(PNL0);
            }, 10);

            break;

          case 4:
            expect(msg.topic).toBe("position/" + POSITION0_ID);
            expect(msg.data?.position?.pos).toEqual(PNL0.position);

            PNL1 = {
              position: Math.random(),
            };
            app.ibApiMock.currentPnLSingle.get(
              POSITION1.contract.conId??0)?.next(PNL1);
            break;

          case 5:
            expect(msg.topic).toBe("position/" + POSITION1_ID);
            expect(msg.data?.position?.pos).toEqual(PNL1.position);

            PNL2 = {
              position: Math.random(),
            };
            app.ibApiMock.currentPnLSingle.get(
              POSITION2.contract.conId??0)?.next(PNL2);
            break;

          case 6:
            expect(msg.topic).toBe("position/" + POSITION2_ID);
            expect(msg.data?.position?.pos).toEqual(PNL2.position);

            positionsMap.set(accountId, POSITIONS);
            Object.assign(POSITION0, {avgCost: Math.random()});
            app.ibApiMock.currentPositionsUpdate.next({
              all: positionsMap,
              changed: new Map<string, Position[]>([[accountId, [POSITION0]]]),
            });
            break;

          case 7:
            expect(msg.topic).toBe("position/" + POSITION0_ID);
            expect(msg.data?.position?.avgCost).toEqual(POSITION0.avgCost);

            // must not trigger any extra event as no changed attributes
            app.ibApiMock.currentPnLSingle.get(
              POSITION0.contract.conId??0)?.next(PNL0);

            app.ibApiMock.currentPositionsUpdate.next({
              all: new Map<string, Position[]>(),
              removed: new Map<string, Position[]>([
                [POSITION0.account, [POSITION0]],
              ]),
            });
            break;

          case 8:
            expect(msg.type).toBe(RealtimeDataMessageType.Unpublish);
            expect(msg.topic).toBe("position/" + POSITION0_ID);

            PNL1 = {
              position: 0, // zero size positions
            };
            app.ibApiMock.currentPnLSingle.get(
              POSITION1.contract.conId??0)?.next(PNL1);

            PNL2 = {
              position: 0, // zero size positions
            };
            app.ibApiMock.currentPnLSingle.get(
              POSITION2.contract.conId??0)?.next(PNL2);

            break;

          case 9:
            expect(msg.type).toBe(RealtimeDataMessageType.Unpublish);
            expect(msg.topic).toBe("position/" + POSITION1_ID);
            break;

          case 10:
            expect(msg.type).toBe(RealtimeDataMessageType.Unpublish);
            expect(msg.topic).toBe("position/" + POSITION2_ID);

            PNL1 = {
              position: 3,
            };
            app.ibApiMock.currentPnLSingle.get(
              POSITION1.contract.conId??0)?.next(PNL1);

            PNL2 = {
              position: 4,
            };
            app.ibApiMock.currentPnLSingle.get(
              POSITION2.contract.conId??0)?.next(PNL2);
            break;

          case 11:
            expect(msg.topic).toBe("position/" + POSITION1_ID);
            expect(msg.data?.position?.pos).toEqual(PNL1.position);
            break;

          case 12:
            expect(msg.topic).toBe("position/" + POSITION2_ID);
            expect(msg.data?.position?.pos).toEqual(PNL2.position);

            Object.assign(POSITION2, {avgCost: Math.random()});
            app.ibApiMock.currentPositionsUpdate.next({
              all: positionsMap,
              changed: new Map<string, Position[]>([[accountId, [POSITION2]]]),
            });
            break;

          case 13:
            expect(msg.topic).toBe("position/" + POSITION2_ID);
            expect(msg.data?.position?.avgCost).toBe(POSITION2.avgCost);

            Object.assign(POSITION2, {pos: 0});
            app.ibApiMock.currentPositionsUpdate.next({
              all: positionsMap,
              changed: new Map<string, Position[]>([[accountId, [POSITION2]]]),
            });
            break;

          case 14:
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
