import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
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

    return await ctx.db
      .query("checklists")
      .withIndex("by_card", q => q.eq("cardId", args.cardId))
      .order("asc")
      .collect();
  }
});

export const add = mutation({
  args: { cardId: v.id("cards"), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");
    const lane = await ctx.db.get(card.laneId);
    if (!lane) throw new Error("Lane not found");
    const board = await ctx.db.get(lane.boardId);
    if (!board || board.userId !== userId) throw new Error("Access denied");

    const items = await ctx.db
      .query("checklists")
      .withIndex("by_card", q => q.eq("cardId", args.cardId))
      .collect();
    const maxPos = Math.max(...items.map(i => i.position), -1);

    return await ctx.db.insert("checklists", {
      cardId: args.cardId,
      text: args.text,
      completed: false,
      position: maxPos + 1,
    });
  }
});

export const toggle = mutation({
  args: { itemId: v.id("checklists"), completed: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const card = await ctx.db.get(item.cardId);
    if (!card) throw new Error("Card not found");
    const lane = await ctx.db.get(card.laneId);
    if (!lane) throw new Error("Lane not found");
    const board = await ctx.db.get(lane.boardId);
    if (!board || board.userId !== userId) throw new Error("Access denied");

    await ctx.db.patch(args.itemId, { completed: args.completed });
  }
});

export const remove = mutation({
  args: { itemId: v.id("checklists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const card = await ctx.db.get(item.cardId);
    if (!card) throw new Error("Card not found");
    const lane = await ctx.db.get(card.laneId);
    if (!lane) throw new Error("Lane not found");
    const board = await ctx.db.get(lane.boardId);
    if (!board || board.userId !== userId) throw new Error("Access denied");

    await ctx.db.delete(args.itemId);
  }
});
