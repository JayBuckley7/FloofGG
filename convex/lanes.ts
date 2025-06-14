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
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    await ensureEditor(ctx, args.boardId, userId);

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
    await ensureEditor(ctx, args.boardId, userId);

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

    await ensureEditor(ctx, lane.boardId, userId);

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

    await ensureEditor(ctx, lane.boardId, userId);

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

    await ensureEditor(ctx, lane.boardId, userId);

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
