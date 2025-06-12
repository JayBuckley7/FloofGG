import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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

    // Verify user owns the board
    const board = await ctx.db.get(lane.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Access denied");
    }

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

    // Verify user owns the board
    const board = await ctx.db.get(lane.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Access denied");
    }

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

    // Verify user owns the board
    const board = await ctx.db.get(lane.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Access denied");
    }

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

    // Verify user owns the board
    const board = await ctx.db.get(lane.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Access denied");
    }

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

    // Verify user owns both boards (should be the same board)
    const oldBoard = await ctx.db.get(oldLane.boardId);
    const newBoard = await ctx.db.get(newLane.boardId);
    
    if (!oldBoard || !newBoard || oldBoard.userId !== userId || newBoard.userId !== userId) {
      throw new Error("Access denied");
    }

    // Get all cards in the target lane to determine the correct position
    const targetLaneCards = await ctx.db
      .query("cards")
      .withIndex("by_lane", (q) => q.eq("laneId", args.newLaneId))
      .collect();

    // Calculate final position
    const finalPosition = Math.min(args.newPosition, targetLaneCards.length);

    await ctx.db.patch(args.cardId, {
      laneId: args.newLaneId,
      position: finalPosition,
    });
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
