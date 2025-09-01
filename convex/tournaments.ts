import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to get authenticated user
async function getAuthenticatedUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return { userId, user };
}

// Create a new tournament
export const createTournament = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    gameType: v.string(),
    maxParticipants: v.number(),
    startDate: v.number(),
    tournamentType: v.union(v.literal("free"), v.literal("participants_pay"), v.literal("exclusive")),
    participantFee: v.optional(v.number()),
    spectatorFee: v.optional(v.number()),
    rules: v.optional(v.string()),
    prizePool: v.optional(v.number()),
    isVideoStreamEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthenticatedUser(ctx);

    const tournamentId = await ctx.db.insert("tournaments", {
      ...args,
      ownerId: userId,
      status: "upcoming",
    });

    // Add the owner as a tournament user
    await ctx.db.insert("tournamentUsers", {
      tournamentId,
      userId,
      role: "owner",
      status: "active",
      registrationDate: Date.now(),
    });

    return tournamentId;
  },
});

// Get all tournaments
export const listTournaments = query({
  args: {
    status: v.optional(v.union(v.literal("upcoming"), v.literal("active"), v.literal("completed"))),
    gameType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tournaments;
    
    if (args.status) {
      tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_status", (q) => q.eq("status", args.status as "upcoming" | "active" | "completed" | "cancelled"))
        .collect();
    } else {
      tournaments = await ctx.db.query("tournaments").collect();
    }
    
    // Filter by game type if specified
    const filteredTournaments = args.gameType 
      ? tournaments.filter(t => t.gameType === args.gameType)
      : tournaments;

    // Get participant counts for each tournament
    const tournamentsWithCounts = await Promise.all(
      filteredTournaments.map(async (tournament) => {
        const participants = await ctx.db
          .query("tournamentUsers")
          .withIndex("by_tournament_and_role", (q) => 
            q.eq("tournamentId", tournament._id).eq("role", "participant")
          )
          .collect();
        
        const spectators = await ctx.db
          .query("tournamentUsers")
          .withIndex("by_tournament_and_role", (q) => 
            q.eq("tournamentId", tournament._id).eq("role", "spectator")
          )
          .collect();

        const owner = await ctx.db.get(tournament.ownerId);

        return {
          ...tournament,
          participantCount: participants.length,
          spectatorCount: spectators.length,
          ownerName: owner?.name || owner?.email || "Unknown",
        };
      })
    );

    return tournamentsWithCounts.filter(t => !t.isDeleted);
  },
});

// Get tournament details
export const getTournament = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.isDeleted) {
      return null;
    }

    const owner = await ctx.db.get(tournament.ownerId);
    const participants = await ctx.db
      .query("tournamentUsers")
      .withIndex("by_tournament_and_role", (q) => 
        q.eq("tournamentId", args.tournamentId).eq("role", "participant")
      )
      .collect();

    const spectators = await ctx.db
      .query("tournamentUsers")
      .withIndex("by_tournament_and_role", (q) => 
        q.eq("tournamentId", args.tournamentId).eq("role", "spectator")
      )
      .collect();

    // Get user details for participants and spectators
    const participantDetails = await Promise.all(
      participants.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return {
          ...p,
          userName: user?.name || user?.email || "Unknown",
          userEmail: user?.email,
        };
      })
    );

    const spectatorDetails = await Promise.all(
      spectators.map(async (s) => {
        const user = await ctx.db.get(s.userId);
        return {
          ...s,
          userName: user?.name || user?.email || "Unknown",
          userEmail: user?.email,
        };
      })
    );

    return {
      ...tournament,
      ownerName: owner?.name || owner?.email || "Unknown",
      participants: participantDetails,
      spectators: spectatorDetails,
    };
  },
});

// Register for tournament
export const registerForTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    role: v.union(v.literal("participant"), v.literal("spectator")),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthenticatedUser(ctx);

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check if user is already registered
    const existingRegistration = await ctx.db
      .query("tournamentUsers")
      .withIndex("by_tournament_and_user", (q) => 
        q.eq("tournamentId", args.tournamentId).eq("userId", userId)
      )
      .first();

    if (existingRegistration) {
      throw new Error("Already registered for this tournament");
    }

    // Check participant limit
    if (args.role === "participant") {
      const currentParticipants = await ctx.db
        .query("tournamentUsers")
        .withIndex("by_tournament_and_role", (q) => 
          q.eq("tournamentId", args.tournamentId).eq("role", "participant")
        )
        .collect();

      if (currentParticipants.length >= tournament.maxParticipants) {
        throw new Error("Tournament is full");
      }
    }

    // Determine payment requirements
    let paymentRequired = false;
    let paymentAmount = 0;

    if (tournament.tournamentType === "participants_pay" && args.role === "participant") {
      paymentRequired = true;
      paymentAmount = tournament.participantFee || 0;
    } else if (tournament.tournamentType === "exclusive") {
      paymentRequired = true;
      paymentAmount = args.role === "participant" 
        ? (tournament.participantFee || 0)
        : (tournament.spectatorFee || 0);
    }

    const registrationId = await ctx.db.insert("tournamentUsers", {
      tournamentId: args.tournamentId,
      userId,
      role: args.role,
      status: paymentRequired ? "registered" : "active",
      registrationDate: Date.now(),
      paymentAmount: paymentRequired ? paymentAmount : undefined,
    });

    return { registrationId, paymentRequired, paymentAmount };
  },
});

// Get user's tournament registrations
export const getUserTournaments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const registrations = await ctx.db
      .query("tournamentUsers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const tournaments = await Promise.all(
      registrations.map(async (reg) => {
        const tournament = await ctx.db.get(reg.tournamentId);
        return {
          ...tournament,
          userRole: reg.role,
          userStatus: reg.status,
          registrationDate: reg.registrationDate,
        };
      })
    );

    return tournaments.filter(t => t && !t.isDeleted);
  },
});
