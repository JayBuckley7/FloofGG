import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../../convex/_generated/dataModel";

async function ensureEditor(ctx: any, boardId: Id<"boards">, userId: Id<"users">) {
  const board = await ctx.db.get(boardId);
  if (!board) throw new Error("Board not found");
  if (board.userId === userId) return board;
  const members = await ctx.db
    .query("boardMembers")
    .withIndex("by_board", q => q.eq("boardId", boardId))
    .collect();
  const allowed = members.some(m => m.userId === userId && m.role === "editor");
  if (!allowed) throw new Error("Access denied");
  return board;
}

export const list = query({
  args: { laneId: v.id("lanes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const lane = await ctx.db.get(args.laneId);
    if (!lane) {
      throw new Error("Lane not found");
    }

    await ensureEditor(ctx, lane.boardId, userId);

    return await ctx.db
      .query("cards")
      .withIndex("by_lane", (q) => q.eq("laneId", args.laneId))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    laneId: v.id("lanes"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const lane = await ctx.db.get(args.laneId);
    if (!lane) {
      throw new Error("Lane not found");
    }

    await ensureEditor(ctx, lane.boardId, userId);

    // Get the highest position
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_lane", (q) => q.eq("laneId", args.laneId))
      .collect();

    const maxPosition = Math.max(...cards.map(c => c.position), -1);

    return await ctx.db.insert("cards", {
      laneId: args.laneId,
      title: args.title,
      description: args.description,
      position: maxPosition + 1,
    });
  },
});

export const update = mutation({
  args: {
    cardId: v.id("cards"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    const lane = await ctx.db.get(card.laneId);
    if (!lane) {
      throw new Error("Lane not found");
    }

    await ensureEditor(ctx, lane.boardId, userId);

    await ctx.db.patch(args.cardId, {
      title: args.title,
      description: args.description,
    });
  },
});

export const remove = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    const lane = await ctx.db.get(card.laneId);
    if (!lane) {
      throw new Error("Lane not found");
    }

    await ensureEditor(ctx, lane.boardId, userId);

    await ctx.db.delete(args.cardId);
  },
});

export const listPublic = query({
  args: { laneId: v.id("lanes") },
  handler: async (ctx, args) => {
    const lane = await ctx.db.get(args.laneId);
    if (!lane) {
      throw new Error("Lane not found");
    }
    const board = await ctx.db.get(lane.boardId);
    if (!board || !board.isPublic) {
      throw new Error("Access denied");
    }

    return await ctx.db
      .query("cards")
      .withIndex("by_lane", (q) => q.eq("laneId", args.laneId))
      .order("asc")
      .collect();
  },
});

export const move = mutation({
  args: {
    cardId: v.id("cards"),
    newLaneId: v.id("lanes"),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    const oldLane = await ctx.db.get(card.laneId);
    const newLane = await ctx.db.get(args.newLaneId);
    
    if (!oldLane || !newLane) {
      throw new Error("Lane not found");
    }

    await ensureEditor(ctx, oldLane.boardId, userId);

    // Reindex cards to keep sequential positions
    const oldLaneCards = await ctx.db
      .query("cards")
      .withIndex("by_lane", (q) => q.eq("laneId", card.laneId))
      .order("asc")
      .collect();

    const oldWithout = oldLaneCards.filter((c) => c._id !== card._id);

    if (args.newLaneId === card.laneId) {
      // Moving within the same lane
      const insertPos = Math.max(0, Math.min(args.newPosition, oldWithout.length));
      oldWithout.splice(insertPos, 0, card);

      for (let i = 0; i < oldWithout.length; i++) {
        const c = oldWithout[i];
        if (c._id === card._id) {
          await ctx.db.patch(c._id, { position: i });
        } else if (c.position !== i) {
          await ctx.db.patch(c._id, { position: i });
        }
      }
      return;
    }

    // Move across lanes
    for (let i = 0; i < oldWithout.length; i++) {
      const c = oldWithout[i];
      if (c.position !== i) {
        await ctx.db.patch(c._id, { position: i });
      }
    }

    const newLaneCards = await ctx.db
      .query("cards")
      .withIndex("by_lane", (q) => q.eq("laneId", args.newLaneId))
      .order("asc")
      .collect();

    const insertPos = Math.max(0, Math.min(args.newPosition, newLaneCards.length));
    newLaneCards.splice(insertPos, 0, { ...card, laneId: args.newLaneId });

    for (let i = 0; i < newLaneCards.length; i++) {
      const c = newLaneCards[i];
      if (c._id === card._id) {
        await ctx.db.patch(c._id, { laneId: args.newLaneId, position: i });
      } else if (c.position !== i) {
        await ctx.db.patch(c._id, { position: i });
      }
    }
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      // Return empty list if not authenticated
      return [];
    }
    // This is an admin-only query, so we don't filter by user
    return await ctx.db.query("cards").collect();
  },
});
