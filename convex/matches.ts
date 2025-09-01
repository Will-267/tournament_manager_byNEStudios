import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get match details
export const getMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return null;
    }

    // Get player details
    const player1 = await ctx.db.get(match.player1Id);
    const player2 = await ctx.db.get(match.player2Id);
    const winner = match.winnerId ? await ctx.db.get(match.winnerId) : null;

    return {
      ...match,
      player1Name: player1?.name || player1?.email || "Unknown",
      player2Name: player2?.name || player2?.email || "Unknown",
      winnerName: winner?.name || winner?.email || null,
    };
  },
});

// Get matches for a tournament
export const getTournamentMatches = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Get player details for each match
    const matchesWithDetails = await Promise.all(
      matches.map(async (match) => {
        const player1 = await ctx.db.get(match.player1Id);
        const player2 = await ctx.db.get(match.player2Id);
        const winner = match.winnerId ? await ctx.db.get(match.winnerId) : null;

        return {
          ...match,
          player1Name: player1?.name || player1?.email || "Unknown",
          player2Name: player2?.name || player2?.email || "Unknown",
          winnerName: winner?.name || winner?.email || null,
        };
      })
    );

    return matchesWithDetails.sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);
  },
});

// Create a new match
export const createMatch = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    round: v.number(),
    matchNumber: v.number(),
    player1Id: v.id("users"),
    player2Id: v.id("users"),
    startTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user is tournament owner
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.ownerId !== userId) {
      throw new Error("Only tournament owners can create matches");
    }

    const matchId = await ctx.db.insert("matches", {
      tournamentId: args.tournamentId,
      round: args.round,
      matchNumber: args.matchNumber,
      player1Id: args.player1Id,
      player2Id: args.player2Id,
      status: "scheduled",
      startTime: args.startTime,
    });

    return matchId;
  },
});

// Start a match
export const startMatch = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Verify user is a player or tournament owner
    const tournament = await ctx.db.get(match.tournamentId);
    const isOwner = tournament?.ownerId === userId;
    const isPlayer = match.player1Id === userId || match.player2Id === userId;

    if (!isOwner && !isPlayer) {
      throw new Error("Not authorized to start this match");
    }

    await ctx.db.patch(args.matchId, {
      status: "active",
      startTime: Date.now(),
    });

    // If it's a chess game, initialize the chess game state
    if (tournament?.gameType === "chess") {
      await ctx.db.insert("chessGames", {
        matchId: args.matchId,
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", // Starting position
        pgn: "",
        currentPlayer: "white",
        gameStatus: "active",
        whitePlayerId: match.player1Id,
        blackPlayerId: match.player2Id,
        timeControl: {
          initialTime: 600, // 10 minutes
          increment: 5, // 5 seconds per move
        },
        whiteTimeRemaining: 600,
        blackTimeRemaining: 600,
        lastMoveTime: Date.now(),
      });
    }

    return { success: true };
  },
});

// End a match
export const endMatch = mutation({
  args: {
    matchId: v.id("matches"),
    winnerId: v.optional(v.id("users")),
    score: v.optional(v.object({
      player1Score: v.number(),
      player2Score: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Verify user is tournament owner
    const tournament = await ctx.db.get(match.tournamentId);
    if (!tournament || tournament.ownerId !== userId) {
      throw new Error("Only tournament owners can end matches");
    }

    await ctx.db.patch(args.matchId, {
      status: "completed",
      winnerId: args.winnerId,
      endTime: Date.now(),
      score: args.score,
    });

    return { success: true };
  },
});
