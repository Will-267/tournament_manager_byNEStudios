import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get chess game state
export const getChessGame = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const chessGame = await ctx.db
      .query("chessGames")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    return chessGame;
  },
});

// Initialize a new chess game
export const initializeChessGame = mutation({
  args: {
    matchId: v.id("matches"),
    whitePlayerId: v.id("users"),
    blackPlayerId: v.id("users"),
    timeControl: v.object({
      initialTime: v.number(),
      increment: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if game already exists
    const existingGame = await ctx.db
      .query("chessGames")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    if (existingGame) {
      throw new Error("Chess game already exists for this match");
    }

    const gameId = await ctx.db.insert("chessGames", {
      matchId: args.matchId,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", // Starting position
      pgn: "",
      currentPlayer: "white",
      gameStatus: "active",
      whitePlayerId: args.whitePlayerId,
      blackPlayerId: args.blackPlayerId,
      timeControl: args.timeControl,
      whiteTimeRemaining: args.timeControl.initialTime,
      blackTimeRemaining: args.timeControl.initialTime,
      lastMoveTime: Date.now(),
    });

    return gameId;
  },
});

// Make a chess move
export const makeMove = mutation({
  args: {
    matchId: v.id("matches"),
    from: v.object({ row: v.number(), col: v.number() }),
    to: v.object({ row: v.number(), col: v.number() }),
    gameData: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const chessGame = await ctx.db
      .query("chessGames")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    if (!chessGame) {
      throw new Error("Chess game not found");
    }

    // Verify it's the player's turn
    const isWhitePlayer = chessGame.whitePlayerId === userId;
    const isBlackPlayer = chessGame.blackPlayerId === userId;
    
    if (!isWhitePlayer && !isBlackPlayer) {
      throw new Error("You are not a player in this game");
    }

    const isPlayersTurn = (chessGame.currentPlayer === "white" && isWhitePlayer) ||
                         (chessGame.currentPlayer === "black" && isBlackPlayer);

    if (!isPlayersTurn) {
      throw new Error("It's not your turn");
    }

    // Update game state
    const newCurrentPlayer = chessGame.currentPlayer === "white" ? "black" : "white";
    const now = Date.now();
    const timeSinceLastMove = now - (chessGame.lastMoveTime || now);
    
    // Update time remaining
    let newWhiteTime = chessGame.whiteTimeRemaining;
    let newBlackTime = chessGame.blackTimeRemaining;
    
    if (chessGame.currentPlayer === "white") {
      newWhiteTime = Math.max(0, chessGame.whiteTimeRemaining - Math.floor(timeSinceLastMove / 1000) + chessGame.timeControl.increment);
    } else {
      newBlackTime = Math.max(0, chessGame.blackTimeRemaining - Math.floor(timeSinceLastMove / 1000) + chessGame.timeControl.increment);
    }

    // Create move notation (simplified)
    const fromSquare = `${String.fromCharCode(97 + args.from.col)}${8 - args.from.row}`;
    const toSquare = `${String.fromCharCode(97 + args.to.col)}${8 - args.to.row}`;
    const moveNotation = `${fromSquare}${toSquare}`;
    
    const newPgn = chessGame.pgn ? `${chessGame.pgn} ${moveNotation}` : moveNotation;

    await ctx.db.patch(chessGame._id, {
      currentPlayer: newCurrentPlayer,
      whiteTimeRemaining: newWhiteTime,
      blackTimeRemaining: newBlackTime,
      lastMoveTime: now,
      pgn: newPgn,
      gameData: args.gameData,
    });

    // Update match status
    await ctx.db.patch(args.matchId, {
      status: "active",
      gameData: args.gameData,
    });

    return { success: true };
  },
});

// Start video stream
export const startVideoStream = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const chessGame = await ctx.db
      .query("chessGames")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    if (!chessGame) {
      throw new Error("Chess game not found");
    }

    // Verify user is a player
    if (chessGame.whitePlayerId !== userId && chessGame.blackPlayerId !== userId) {
      throw new Error("Only players can start video streams");
    }

    // Update match with stream URL (in a real app, this would be a WebRTC or streaming service URL)
    const match = await ctx.db.get(args.matchId);
    if (match) {
      await ctx.db.patch(args.matchId, {
        gameData: JSON.stringify({
          ...JSON.parse(match.gameData || "{}"),
          streamActive: true,
          streamStartedBy: userId,
        }),
      });
    }

    return { success: true };
  },
});

// Stop video stream
export const stopVideoStream = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const match = await ctx.db.get(args.matchId);
    if (match) {
      const gameData = JSON.parse(match.gameData || "{}");
      await ctx.db.patch(args.matchId, {
        gameData: JSON.stringify({
          ...gameData,
          streamActive: false,
          streamStartedBy: null,
        }),
      });
    }

    return { success: true };
  },
});

// Resign from game
export const resignGame = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const chessGame = await ctx.db
      .query("chessGames")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    if (!chessGame) {
      throw new Error("Chess game not found");
    }

    // Verify user is a player
    if (chessGame.whitePlayerId !== userId && chessGame.blackPlayerId !== userId) {
      throw new Error("You are not a player in this game");
    }

    // Determine winner
    const winnerId = chessGame.whitePlayerId === userId ? chessGame.blackPlayerId : chessGame.whitePlayerId;

    // Update chess game
    await ctx.db.patch(chessGame._id, {
      gameStatus: "resignation",
    });

    // Update match
    await ctx.db.patch(args.matchId, {
      status: "completed",
      winnerId,
      endTime: Date.now(),
    });

    return { success: true };
  },
});

// Offer draw
export const offerDraw = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const chessGame = await ctx.db
      .query("chessGames")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    if (!chessGame) {
      throw new Error("Chess game not found");
    }

    // Verify user is a player
    if (chessGame.whitePlayerId !== userId && chessGame.blackPlayerId !== userId) {
      throw new Error("You are not a player in this game");
    }

    // In a real implementation, this would notify the other player
    // For now, we'll just update the game data
    const match = await ctx.db.get(args.matchId);
    if (match) {
      const gameData = JSON.parse(match.gameData || "{}");
      await ctx.db.patch(args.matchId, {
        gameData: JSON.stringify({
          ...gameData,
          drawOfferedBy: userId,
          drawOfferTime: Date.now(),
        }),
      });
    }

    return { success: true };
  },
});
