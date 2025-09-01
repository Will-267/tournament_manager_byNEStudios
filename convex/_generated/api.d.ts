/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as chess from "../chess.js";
import type * as http from "../http.js";
import type * as matches from "../matches.js";
import type * as payments from "../payments.js";
import type * as router from "../router.js";
import type * as tournaments from "../tournaments.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  chat: typeof chat;
  chess: typeof chess;
  http: typeof http;
  matches: typeof matches;
  payments: typeof payments;
  router: typeof router;
  tournaments: typeof tournaments;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
