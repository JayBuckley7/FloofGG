import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the board
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found or access denied");
    }

    return await ctx.db
      .query("lanes")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the board
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found or access denied");
    }

    // Get the highest position
    const lanes = await ctx.db
      .query("lanes")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const maxPosition = Math.max(...lanes.map(l => l.position), -1);

    return await ctx.db.insert("lanes", {
      boardId: args.boardId,
      name: args.name,
      position: maxPosition + 1,
      color: args.color,
    });
  },
});

export const update = mutation({
  args: {
    laneId: v.id("lanes"),
    name: v.string(),
    color: v.optional(v.string()),
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

    await ctx.db.patch(args.laneId, {
      name: args.name,
      color: args.color,
    });
  },
});

export const remove = mutation({
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

    // Delete all cards in this lane
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_lane", (q) => q.eq("laneId", args.laneId))
      .collect();

    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    await ctx.db.delete(args.laneId);
  },
});

export const reorder = mutation({
  args: {
    laneId: v.id("lanes"),
    newPosition: v.number(),
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

    await ctx.db.patch(args.laneId, { position: args.newPosition });
  },
});

export const listPublic = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board || !board.isPublic) {
      throw new Error("Board not found or not public");
    }

    return await ctx.db
      .query("lanes")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .order("asc")
      .collect();
  },
});
