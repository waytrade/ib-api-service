import {
  ConnectionState,
  Contract,
  ContractDetails,
  ContractDetailsUpdate,
  IBApiNextCreationOptions,
  Logger,
} from "@stoqey/ib";
import {BehaviorSubject, Observable} from "rxjs";

export class IBApiNextMock {
  constructor(private options?: IBApiNextCreationOptions) {}

  get logger(): Logger | undefined {
    return this.options?.logger;
  }

  private _connectionState = new BehaviorSubject<ConnectionState>(
    ConnectionState.Disconnected,
  );

  get connectionState(): Observable<ConnectionState> {
    return this._connectionState;
  }

  connect(clientId?: number): IBApiNextMock {
    this.options?.logger?.debug(
      "IBApiMock",
      "changed ConnectionState to Connecting.",
    );
    this._connectionState.next(ConnectionState.Connecting);

    this.options?.logger?.info(
      "IBApiMock",
      "changed ConnectionState to Connected.",
    );
    this._connectionState.next(ConnectionState.Connected);

    return this;
  }

  disconnect(): IBApiNextMock {
    if (this._connectionState.value !== ConnectionState.Disconnected) {
      this.options?.logger?.info(
        "IBApiMock",
        "changed ConnectionState to Disconnected.",
      );
      this._connectionState.next(ConnectionState.Disconnected);
    }
    return this;
  }

  readonly contractDb = new Map<number, ContractDetails>();

  getContractDetails(contract: Contract): Observable<ContractDetailsUpdate> {
    return new Observable<ContractDetailsUpdate>(sub => {
      const details = this.contractDb.get(contract.conId ?? 0);
      const update: ContractDetailsUpdate = {
        all: [],
      };
      if (details) {
        update.all.push(details);
        update.added?.push(details);
      }
      sub.next(update);
      sub.complete();
    });
  }
}
