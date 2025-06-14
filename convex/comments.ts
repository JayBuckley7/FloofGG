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
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const lane = await ctx.db.get(card.laneId);
    if (!lane) throw new Error("Lane not found");

    await ensureEditor(ctx, lane.boardId, userId);

    return await ctx.db
      .query("comments")
      .withIndex("by_card", q => q.eq("cardId", args.cardId))
      .order("desc")
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

    await ensureEditor(ctx, lane.boardId, userId);

    const id = await ctx.db.insert("comments", {
      cardId: args.cardId,
      userId,
      text: args.text,
      createdAt: Date.now(),
    });

    await ctx.db.insert("activities", {
      cardId: args.cardId,
      userId,
      type: "comment",
      text: args.text,
      createdAt: Date.now(),
    });

    return id;
  }
});
