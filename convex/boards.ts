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

export const duplicate = mutation({
  args: {
    boardId: v.id("boards"),
    withCards: v.optional(v.boolean()),
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

    const newBoardId = await ctx.db.insert("boards", {
      name: `${board.name} Copy`,
      description: board.description,
      background: board.background,
      userId,
      isPublic: board.isPublic,
    });

    const lanes = await ctx.db
      .query("lanes")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .order("asc")
      .collect();

    const laneIdMap = new Map();
    for (const lane of lanes) {
      const newLaneId = await ctx.db.insert("lanes", {
        boardId: newBoardId,
        name: lane.name,
        position: lane.position,
        color: lane.color,
      });
      laneIdMap.set(lane._id, newLaneId);
    }

    if (args.withCards) {
      for (const lane of lanes) {
        const cards = await ctx.db
          .query("cards")
          .withIndex("by_lane", (q) => q.eq("laneId", lane._id))
          .collect();

        for (const card of cards) {
          await ctx.db.insert("cards", {
            laneId: laneIdMap.get(lane._id),
            title: card.title,
            description: card.description,
            position: card.position,
          });
        }
      }
    }

    return newBoardId;
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

export const clone = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    if (!board.isPublic && board.userId !== userId) {
      throw new Error("Access denied");
    }

    const newBoardId = await ctx.db.insert("boards", {
      name: board.name,
      description: board.description,
      background: board.background,
      userId,
      isPublic: false,
    });

    const lanes = await ctx.db
      .query("lanes")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    for (const lane of lanes) {
      await ctx.db.insert("lanes", {
        boardId: newBoardId,
        name: lane.name,
        position: lane.position,
        color: lane.color,
      });
    }

    return newBoardId;
  },
});

export const addMember = mutation({
  args: { boardId: v.id("boards"), userId: v.id("users"), role: v.string() },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== callerId) throw new Error("Access denied");

    const existing = await ctx.db
      .query("boardMembers")
      .withIndex("by_board", q => q.eq("boardId", args.boardId))
      .collect();
    if (existing.find(m => m.userId === args.userId)) return;

    await ctx.db.insert("boardMembers", {
      boardId: args.boardId,
      userId: args.userId,
      role: args.role,
    });
  },
});

export const removeMember = mutation({
  args: { boardId: v.id("boards"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== callerId) throw new Error("Access denied");

    const members = await ctx.db
      .query("boardMembers")
      .withIndex("by_board", q => q.eq("boardId", args.boardId))
      .collect();
    const member = members.find(m => m.userId === args.userId);
    if (member) await ctx.db.delete(member._id);
  },
});

export const leaveBoard = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const members = await ctx.db
      .query("boardMembers")
      .withIndex("by_board", q => q.eq("boardId", args.boardId))
      .collect();
    const member = members.find(m => m.userId === userId);
    if (member) await ctx.db.delete(member._id);
  },
});

export const listMembers = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board) throw new Error("Board not found");

    if (board.userId !== userId) {
      const members = await ctx.db
        .query("boardMembers")
        .withIndex("by_board", q => q.eq("boardId", args.boardId))
        .collect();
      if (!members.some(m => m.userId === userId)) {
        throw new Error("Access denied");
      }
    }

    const members = await ctx.db
      .query("boardMembers")
      .withIndex("by_board", q => q.eq("boardId", args.boardId))
      .collect();

    const results = [] as any[];
    for (const m of members) {
      const u = await ctx.db.get(m.userId);
      results.push({ ...m, email: u?.email });
    }
    results.push({ boardId: args.boardId, userId: board.userId, role: "owner" });
    return results;
  },
});
