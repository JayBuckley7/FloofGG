import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listForBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) throw new Error("Access denied");

    return await ctx.db
      .query("labels")
      .withIndex("by_board", q => q.eq("boardId", args.boardId))
      .collect();
  }
});

export const create = mutation({
  args: { boardId: v.id("boards"), name: v.string(), color: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) throw new Error("Access denied");

    return await ctx.db.insert("labels", {
      boardId: args.boardId,
      name: args.name,
      color: args.color,
    });
  }
});

export const labelsForCard = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const lane = await ctx.db.get(card.laneId);
    if (!lane) throw new Error("Lane not found");

    const board = await ctx.db.get(lane.boardId);
    if (!board || board.userId !== userId) throw new Error("Access denied");

    const assigns = await ctx.db
      .query("cardLabels")
      .withIndex("by_card", q => q.eq("cardId", args.cardId))
      .collect();

    const labels = [] as any[];
    for (const assign of assigns) {
      const label = await ctx.db.get(assign.labelId);
      if (label) labels.push(label);
    }
    return labels;
  }
});

export const toggleLabelOnCard = mutation({
  args: { cardId: v.id("cards"), labelId: v.id("labels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const lane = await ctx.db.get(card.laneId);
    if (!lane) throw new Error("Lane not found");

    const board = await ctx.db.get(lane.boardId);
    if (!board || board.userId !== userId) throw new Error("Access denied");

    const existing = await ctx.db
      .query("cardLabels")
      .withIndex("by_card_label", q => q.eq("cardId", args.cardId).eq("labelId", args.labelId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("cardLabels", { cardId: args.cardId, labelId: args.labelId });
    }
  }
});
