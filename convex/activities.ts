import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listForCard = query({
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
      .query("activities")
      .withIndex("by_card", q => q.eq("cardId", args.cardId))
      .order("desc")
      .collect();
  }
});
