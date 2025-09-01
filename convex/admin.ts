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

// Kick user from tournament (tournament owner only)
export const kickUserFromTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthenticatedUser(ctx);

    // Verify user is tournament owner
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.ownerId !== userId) {
      throw new Error("Only tournament owners can kick users");
    }

    // Find and update user registration
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

    return { success: true };
  },
});

// Update tournament status (tournament owner only)
export const updateTournamentStatus = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    status: v.union(v.literal("upcoming"), v.literal("active"), v.literal("completed"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthenticatedUser(ctx);

    // Verify user is tournament owner
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.ownerId !== userId) {
      throw new Error("Only tournament owners can update tournament status");
    }

    await ctx.db.patch(args.tournamentId, {
      status: args.status,
    });

    return { success: true };
  },
});

// Delete tournament (tournament owner only)
export const deleteTournament = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const { userId } = await getAuthenticatedUser(ctx);

    // Verify user is tournament owner
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.ownerId !== userId) {
      throw new Error("Only tournament owners can delete tournaments");
    }

    await ctx.db.patch(args.tournamentId, {
      isDeleted: true,
    });

    return { success: true };
  },
});

// Platform admin functions (for app owner)
const PLATFORM_ADMIN_EMAIL = "admin@nestudios.com"; // Change this to your email

async function verifyPlatformAdmin(ctx: any) {
  const { userId, user } = await getAuthenticatedUser(ctx);
  if (user.email !== PLATFORM_ADMIN_EMAIL) {
    throw new Error("Platform admin access required");
  }
  return { userId, user };
}

// Get all tournaments (platform admin only)
export const getAllTournaments = query({
  args: {},
  handler: async (ctx) => {
    await verifyPlatformAdmin(ctx);

    const tournaments = await ctx.db.query("tournaments").collect();
    
    const tournamentsWithDetails = await Promise.all(
      tournaments.map(async (tournament) => {
        const owner = await ctx.db.get(tournament.ownerId);
        const participants = await ctx.db
          .query("tournamentUsers")
          .withIndex("by_tournament_and_role", (q) => 
            q.eq("tournamentId", tournament._id).eq("role", "participant")
          )
          .collect();
        
        return {
          ...tournament,
          ownerName: owner?.name || owner?.email || "Unknown",
          ownerEmail: owner?.email,
          participantCount: participants.length,
        };
      })
    );

    return tournamentsWithDetails;
  },
});

// Force delete tournament (platform admin only)
export const forceDeleteTournament = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    await verifyPlatformAdmin(ctx);

    await ctx.db.patch(args.tournamentId, {
      isDeleted: true,
    });

    // Log admin action
    const { userId } = await getAuthenticatedUser(ctx);
    await ctx.db.insert("adminLogs", {
      adminId: userId,
      action: "force_delete_tournament",
      targetType: "tournament",
      targetId: args.tournamentId,
      details: "Tournament force deleted by platform admin",
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Get payment statistics (platform admin only)
export const getPaymentStats = query({
  args: {},
  handler: async (ctx) => {
    await verifyPlatformAdmin(ctx);

    const payments = await ctx.db.query("payments").collect();
    
    const stats = {
      totalPayments: payments.length,
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
      platformFees: payments.reduce((sum, p) => sum + p.platformFee, 0),
      hostPayouts: payments.reduce((sum, p) => sum + p.hostAmount, 0),
      completedPayments: payments.filter(p => p.status === "completed").length,
      pendingPayments: payments.filter(p => p.status === "pending").length,
      failedPayments: payments.filter(p => p.status === "failed").length,
    };

    return stats;
  },
});

// Get admin logs (platform admin only)
export const getAdminLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await verifyPlatformAdmin(ctx);

    const logs = await ctx.db
      .query("adminLogs")
      .withIndex("by_timestamp", (q) => q)
      .order("desc")
      .take(args.limit || 50);

    const logsWithDetails = await Promise.all(
      logs.map(async (log) => {
        const admin = await ctx.db.get(log.adminId);
        return {
          ...log,
          adminName: admin?.name || admin?.email || "Unknown",
        };
      })
    );

    return logsWithDetails;
  },
});
