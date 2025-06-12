import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    background: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const boardId = await ctx.db.insert("boards", {
      name: args.name,
      description: args.description,
      background: args.background,
      userId,
      isPublic: args.isPublic ?? false,
    });

    // Create default lanes
    const defaultLanes = ["To Do", "In Progress", "Done"];
    for (let i = 0; i < defaultLanes.length; i++) {
      await ctx.db.insert("lanes", {
        boardId,
        name: defaultLanes[i],
        position: i,
      });
    }

    return boardId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("boards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const get = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found or access denied");
    }

    return board;
  },
});

export const update = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.string(),
    description: v.optional(v.string()),
    background: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found or access denied");
    }

    await ctx.db.patch(args.boardId, {
      name: args.name,
      description: args.description,
      background: args.background,
      isPublic: args.isPublic ?? board.isPublic,
    });
  },
});

export const remove = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found or access denied");
    }

    // Delete all cards in all lanes of this board
    const lanes = await ctx.db
      .query("lanes")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    for (const lane of lanes) {
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_lane", (q) => q.eq("laneId", lane._id))
        .collect();
      
      for (const card of cards) {
        await ctx.db.delete(card._id);
      }
      await ctx.db.delete(lane._id);
    }

    await ctx.db.delete(args.boardId);
  },
});

export const getPublic = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board || !board.isPublic) {
      return null;
    }
    return board;
  },
});
