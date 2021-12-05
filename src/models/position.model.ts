import {model, property} from "@waytrade/microservice-core";

/**
 * A position on an IBKR account.
 */
@model("An positions on an IBKR account")
export class Position {
  constructor(contract: Position) {
    Object.assign(this, contract);
  }

  /** The position id. */
  @property("The position id.")
  id!: string;

  /** The account id. */
  @property("The account id.")
  account?: string;

  /** The position's contract id. */
  @property("The position's contract id.")
  conId?: number;

  /** The number of positions held. */
  @property("The number of positions held.")
  pos?: number;

  /** The daily PnL. */
  @property("The daily PnL.")
  dailyPnL?: number;

  /** The daily unrealized PnL. */
  @property("The daily unrealized PnL.")
  unrealizedPnL?: number;

  /** The daily realized PnL. */
  @property("The daily realized PnL.")
  realizedPnL?: number;

  /** The average cost of the position. */
  @property("The average cost of the position.")
  avgCost?: number;

  /** The current market value of the position. */
  @property("The current market value of the position.")
  marketValue?: number;
}
