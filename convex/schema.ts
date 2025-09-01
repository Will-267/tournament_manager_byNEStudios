import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Tournament management
  tournaments: defineTable({
    name: v.string(),
    description: v.string(),
    gameType: v.string(), // "chess", "poker", etc.
    maxParticipants: v.number(),
    status: v.union(v.literal("upcoming"), v.literal("active"), v.literal("completed"), v.literal("cancelled")),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    ownerId: v.id("users"),
    
    // Tournament type and pricing
    tournamentType: v.union(
      v.literal("free"), // Free for all
      v.literal("participants_pay"), // Only participants pay
      v.literal("exclusive") // Both participants and spectators pay
    ),
    participantFee: v.optional(v.number()),
    spectatorFee: v.optional(v.number()),
    
    // Tournament settings
    rules: v.optional(v.string()),
    prizePool: v.optional(v.number()),
    isVideoStreamEnabled: v.boolean(),
    streamUrl: v.optional(v.string()),
    
    // Admin settings
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_game_type", ["gameType"]),

  // Tournament participants and spectators
  tournamentUsers: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("participant"), v.literal("spectator")),
    status: v.union(v.literal("registered"), v.literal("paid"), v.literal("active"), v.literal("kicked")),
    registrationDate: v.number(),
    paymentStatus: v.optional(v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"))),
    paymentAmount: v.optional(v.number()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_user", ["userId"])
    .index("by_tournament_and_user", ["tournamentId", "userId"])
    .index("by_tournament_and_role", ["tournamentId", "role"]),

  // Tournament matches/games
  matches: defineTable({
    tournamentId: v.id("tournaments"),
    round: v.number(),
    matchNumber: v.number(),
    player1Id: v.id("users"),
    player2Id: v.id("users"),
    winnerId: v.optional(v.id("users")),
    status: v.union(v.literal("scheduled"), v.literal("active"), v.literal("completed"), v.literal("cancelled")),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    gameData: v.optional(v.string()), // JSON string for game state
    score: v.optional(v.object({
      player1Score: v.number(),
      player2Score: v.number(),
    })),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_and_round", ["tournamentId", "round"])
    .index("by_player", ["player1Id"])
    .index("by_player2", ["player2Id"]),

  // Tournament rankings
  rankings: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    position: v.number(),
    points: v.number(),
    wins: v.number(),
    losses: v.number(),
    draws: v.optional(v.number()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_and_position", ["tournamentId", "position"]),

  // Chat messages
  chatMessages: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    message: v.string(),
    timestamp: v.number(),
    isDeleted: v.optional(v.boolean()),
    deletedBy: v.optional(v.id("users")),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_and_timestamp", ["tournamentId", "timestamp"]),

  // Payment transactions
  payments: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    amount: v.number(),
    platformFee: v.number(), // 10% platform fee
    hostAmount: v.number(), // Amount after platform fee
    paymentType: v.union(v.literal("participant_fee"), v.literal("spectator_fee")),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"), v.literal("refunded")),
    paymentIntentId: v.optional(v.string()), // Stripe payment intent ID
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Host payouts
  payouts: defineTable({
    hostId: v.id("users"),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    requestedAt: v.number(),
    processedAt: v.optional(v.number()),
    payoutMethod: v.optional(v.string()),
    transactionId: v.optional(v.string()),
  })
    .index("by_host", ["hostId"])
    .index("by_status", ["status"]),

  // Chess game states (for chess tournaments)
  chessGames: defineTable({
    matchId: v.id("matches"),
    fen: v.string(), // Chess position in FEN notation
    pgn: v.string(), // Game moves in PGN format
    currentPlayer: v.union(v.literal("white"), v.literal("black")),
    gameStatus: v.union(
      v.literal("active"),
      v.literal("checkmate"),
      v.literal("stalemate"),
      v.literal("draw"),
      v.literal("resignation"),
      v.literal("timeout")
    ),
    whitePlayerId: v.id("users"),
    blackPlayerId: v.id("users"),
    timeControl: v.object({
      initialTime: v.number(), // in seconds
      increment: v.number(), // increment per move in seconds
    }),
    whiteTimeRemaining: v.number(),
    blackTimeRemaining: v.number(),
    lastMoveTime: v.optional(v.number()),
    gameData: v.optional(v.string()), // JSON string for additional game state
  })
    .index("by_match", ["matchId"]),

  // Admin logs for moderation
  adminLogs: defineTable({
    adminId: v.id("users"),
    action: v.string(),
    targetType: v.union(v.literal("tournament"), v.literal("user"), v.literal("payment")),
    targetId: v.string(),
    details: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_admin", ["adminId"])
    .index("by_timestamp", ["timestamp"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
