import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Send a chat message
export const sendMessage = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is part of the tournament
    const userRegistration = await ctx.db
      .query("tournamentUsers")
      .withIndex("by_tournament_and_user", (q) => 
        q.eq("tournamentId", args.tournamentId).eq("userId", userId)
      )
      .first();

    if (!userRegistration || userRegistration.status === "kicked") {
      throw new Error("Not authorized to chat in this tournament");
    }

    return await ctx.db.insert("chatMessages", {
      tournamentId: args.tournamentId,
      userId,
      message: args.message,
      timestamp: Date.now(),
    });
  },
});

// Get chat messages for a tournament
export const getMessages = query({
  args: {
    tournamentId: v.id("tournaments"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Check if user is part of the tournament
    const userRegistration = await ctx.db
      .query("tournamentUsers")
      .withIndex("by_tournament_and_user", (q) => 
        q.eq("tournamentId", args.tournamentId).eq("userId", userId)
      )
      .first();

    if (!userRegistration) {
      return [];
    }

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_tournament_and_timestamp", (q) => 
        q.eq("tournamentId", args.tournamentId)
      )
      .order("desc")
      .take(args.limit || 50);

    // Get user details for each message
    const messagesWithUsers = await Promise.all(
      messages.map(async (message) => {
        if (message.isDeleted) {
          return {
            ...message,
            userName: "Deleted User",
            userEmail: "",
            message: "[Message deleted]",
          };
        }

        const user = await ctx.db.get(message.userId);
        return {
          ...message,
          userName: user?.name || user?.email || "Unknown User",
          userEmail: user?.email || "",
        };
      })
    );

    return messagesWithUsers.reverse();
  },
});

// Delete a message (admin only)
export const deleteMessage = mutation({
  args: {
    messageId: v.id("chatMessages"),
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is tournament owner
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.ownerId !== userId) {
      throw new Error("Not authorized to delete messages");
    }

    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      deletedBy: userId,
    });
  },
});

// Kick user from tournament chat
export const kickUser = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is tournament owner
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.ownerId !== userId) {
      throw new Error("Not authorized to kick users");
    }

    // Update user status to kicked
    const userRegistration = await ctx.db
      .query("tournamentUsers")
      .withIndex("by_tournament_and_user", (q) => 
        q.eq("tournamentId", args.tournamentId).eq("userId", args.targetUserId)
      )
      .first();

    if (userRegistration) {
      await ctx.db.patch(userRegistration._id, {
        status: "kicked",
      });
    }
  },
});
