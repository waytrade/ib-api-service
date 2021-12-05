import {arrayProperty, model} from "@waytrade/microservice-core";
import {Position} from "./position.model";

/**
 * A list of positions.
 */
@model("A list of positions.")
export class PositionList {
  /** Array of positions. */
  @arrayProperty(Position, "Array of positions.")
  positions?: Position[];
}
