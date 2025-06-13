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

  comments: defineTable({
    cardId: v.id("cards"),
    userId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_card", ["cardId"]),

  labels: defineTable({
    boardId: v.id("boards"),
    name: v.string(),
    color: v.string(),
  }).index("by_board", ["boardId"]),

  cardLabels: defineTable({
    cardId: v.id("cards"),
    labelId: v.id("labels"),
  })
    .index("by_card", ["cardId"])
    .index("by_label", ["labelId"])
    .index("by_card_label", ["cardId", "labelId"]),

  activities: defineTable({
    cardId: v.id("cards"),
    userId: v.id("users"),
    type: v.string(),
    text: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_card", ["cardId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
