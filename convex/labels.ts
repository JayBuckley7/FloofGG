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

export const listForBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ensureEditor(ctx, args.boardId, userId);

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
    await ensureEditor(ctx, args.boardId, userId);

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

    await ensureEditor(ctx, lane.boardId, userId);

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

    await ensureEditor(ctx, lane.boardId, userId);

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
