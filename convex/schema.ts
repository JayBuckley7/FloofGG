import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  boards: defineTable({
    name: v.string(),
    userId: v.id("users"),
    description: v.optional(v.string()),
    background: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  lanes: defineTable({
    boardId: v.id("boards"),
    name: v.string(),
    position: v.number(),
    color: v.optional(v.string()),
  }).index("by_board", ["boardId"]),

  cards: defineTable({
    laneId: v.id("lanes"),
    title: v.string(),
    description: v.optional(v.string()),
    position: v.number(),
  }).index("by_lane", ["laneId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
