import {model, property} from "@waytrade/microservice-core";

/** A username and password combination. */
@model("A username and password combination.")
export class UsernamePassword {
  /** The username. */
  @property("The username")
  username!: string;

  /** The password. */
  @property("The password")
  password!: string;
}
