import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CBNWAEM73P6ZXULQEW227Z2JE5YSZPMEIXH2A2YS6ZKVX4YMJE3ZOAWS",
  }
} as const

export type DataKey = {tag: "Admin", values: void} | {tag: "EventName", values: void} | {tag: "MaxTickets", values: void} | {tag: "Price", values: void} | {tag: "Asset", values: void} | {tag: "CurrentTicketId", values: void} | {tag: "TicketOwner", values: readonly [u32]} | {tag: "TicketState", values: readonly [u32]};

export type TicketState = {tag: "Valid", values: void} | {tag: "Used", values: void};

export interface Client {
  /**
   * Construct and simulate a get_owner transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the owner of a ticket.
   */
  get_owner: ({ticket_id}: {ticket_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the event. Can only be called once.
   */
  initialize: ({admin, event_name, max_tickets, price, asset}: {admin: string, event_name: string, max_tickets: u32, price: i128, asset: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a use_ticket transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Mark a ticket as used. Only the admin can do this (e.g. scanning at the door).
   */
  use_ticket: ({admin, ticket_id}: {admin: string, ticket_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a claim_ticket transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Claim a ticket by paying the price in the specified asset.
   */
  claim_ticket: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a verify_ticket transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Verify a ticket's state.
   */
  verify_ticket: ({ticket_id}: {ticket_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<TicketState>>

  /**
   * Construct and simulate a is_initialized transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check if the event is initialized.
   */
  is_initialized: (options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAACAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAJRXZlbnROYW1lAAAAAAAAAAAAAAAAAAAKTWF4VGlja2V0cwAAAAAAAAAAAAAAAAAFUHJpY2UAAAAAAAAAAAAAAAAAAAVBc3NldAAAAAAAAAAAAAAAAAAAD0N1cnJlbnRUaWNrZXRJZAAAAAABAAAAAAAAAAtUaWNrZXRPd25lcgAAAAABAAAABAAAAAEAAAAAAAAAC1RpY2tldFN0YXRlAAAAAAEAAAAE",
        "AAAAAgAAAAAAAAAAAAAAC1RpY2tldFN0YXRlAAAAAAIAAAAAAAAAAAAAAAVWYWxpZAAAAAAAAAAAAAAAAAAABFVzZWQ=",
        "AAAAAAAAABpHZXQgdGhlIG93bmVyIG9mIGEgdGlja2V0LgAAAAAACWdldF9vd25lcgAAAAAAAAEAAAAAAAAACXRpY2tldF9pZAAAAAAAAAQAAAABAAAAEw==",
        "AAAAAAAAAC5Jbml0aWFsaXplIHRoZSBldmVudC4gQ2FuIG9ubHkgYmUgY2FsbGVkIG9uY2UuAAAAAAAKaW5pdGlhbGl6ZQAAAAAABQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAApldmVudF9uYW1lAAAAAAAQAAAAAAAAAAttYXhfdGlja2V0cwAAAAAEAAAAAAAAAAVwcmljZQAAAAAAAAsAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAA=",
        "AAAAAAAAAE5NYXJrIGEgdGlja2V0IGFzIHVzZWQuIE9ubHkgdGhlIGFkbWluIGNhbiBkbyB0aGlzIChlLmcuIHNjYW5uaW5nIGF0IHRoZSBkb29yKS4AAAAAAAp1c2VfdGlja2V0AAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAACXRpY2tldF9pZAAAAAAAAAQAAAAA",
        "AAAAAAAAADpDbGFpbSBhIHRpY2tldCBieSBwYXlpbmcgdGhlIHByaWNlIGluIHRoZSBzcGVjaWZpZWQgYXNzZXQuAAAAAAAMY2xhaW1fdGlja2V0AAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAABA==",
        "AAAAAAAAABhWZXJpZnkgYSB0aWNrZXQncyBzdGF0ZS4AAAANdmVyaWZ5X3RpY2tldAAAAAAAAAEAAAAAAAAACXRpY2tldF9pZAAAAAAAAAQAAAABAAAH0AAAAAtUaWNrZXRTdGF0ZQA=",
        "AAAAAAAAACJDaGVjayBpZiB0aGUgZXZlbnQgaXMgaW5pdGlhbGl6ZWQuAAAAAAAOaXNfaW5pdGlhbGl6ZWQAAAAAAAAAAAABAAAAAQ==" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_owner: this.txFromJSON<string>,
        initialize: this.txFromJSON<null>,
        use_ticket: this.txFromJSON<null>,
        claim_ticket: this.txFromJSON<u32>,
        verify_ticket: this.txFromJSON<TicketState>,
        is_initialized: this.txFromJSON<boolean>
  }
}