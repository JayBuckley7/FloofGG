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
import type * as activities from "../activities.js";
import type * as auth from "../auth.js";
import type * as boards from "../boards.js";
import type * as cards from "../cards.js";
import type * as checklists from "../checklists.js";
import type * as comments from "../comments.js";
import type * as http from "../http.js";
import type * as labels from "../labels.js";
import type * as lanes from "../lanes.js";
import type * as router from "../router.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  auth: typeof auth;
  boards: typeof boards;
  cards: typeof cards;
  checklists: typeof checklists;
  comments: typeof comments;
  http: typeof http;
  labels: typeof labels;
  lanes: typeof lanes;
  router: typeof router;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
