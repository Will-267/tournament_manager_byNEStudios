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

// Create payment intent for tournament registration
export const createPaymentIntent = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    paymentType: v.union(v.literal("participant_fee"), v.literal("spectator_fee")),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthenticatedUser(ctx);

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Calculate platform fee (10%)
    const platformFee = Math.round(args.amount * 0.1 * 100) / 100;
    const hostAmount = args.amount - platformFee;

    const paymentId = await ctx.db.insert("payments", {
      tournamentId: args.tournamentId,
      userId,
      amount: args.amount,
      platformFee,
      hostAmount,
      paymentType: args.paymentType,
      status: "pending",
      createdAt: Date.now(),
    });

    // In a real implementation, you would integrate with Stripe or another payment processor
    // For now, we'll simulate a payment intent ID
    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await ctx.db.patch(paymentId, {
      paymentIntentId,
    });

    return {
      paymentId,
      paymentIntentId,
      amount: args.amount,
      platformFee,
      hostAmount,
    };
  },
});

// Complete payment (called after successful payment processing)
export const completePayment = mutation({
  args: {
    paymentId: v.id("payments"),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthenticatedUser(ctx);

    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.userId !== userId) {
      throw new Error("Not authorized to complete this payment");
    }

    if (payment.paymentIntentId !== args.paymentIntentId) {
      throw new Error("Invalid payment intent ID");
    }

    // Update payment status
    await ctx.db.patch(args.paymentId, {
      status: "completed",
      completedAt: Date.now(),
    });

    // Update user registration status
    const userRegistration = await ctx.db
      .query("tournamentUsers")
      .withIndex("by_tournament_and_user", (q) => 
        q.eq("tournamentId", payment.tournamentId).eq("userId", userId)
      )
      .first();

    if (userRegistration) {
      await ctx.db.patch(userRegistration._id, {
        status: "paid",
        paymentStatus: "completed",
      });
    }

    return { success: true };
  },
});

// Get user's payment history
export const getUserPayments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const paymentsWithTournaments = await Promise.all(
      payments.map(async (payment) => {
        const tournament = await ctx.db.get(payment.tournamentId);
        return {
          ...payment,
          tournamentName: tournament?.name || "Unknown Tournament",
        };
      })
    );

    return paymentsWithTournaments.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get tournament payments (tournament owner only)
export const getTournamentPayments = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user is tournament owner
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.ownerId !== userId) {
      throw new Error("Only tournament owners can view payments");
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    const paymentsWithUsers = await Promise.all(
      payments.map(async (payment) => {
        const user = await ctx.db.get(payment.userId);
        return {
          ...payment,
          userName: user?.name || user?.email || "Unknown User",
          userEmail: user?.email,
        };
      })
    );

    return paymentsWithUsers.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Request payout (tournament owner only)
export const requestPayout = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthenticatedUser(ctx);

    // Verify user is tournament owner
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.ownerId !== userId) {
      throw new Error("Only tournament owners can request payouts");
    }

    // Calculate available payout amount
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    const completedPayments = payments.filter(p => p.status === "completed");
    const totalHostAmount = completedPayments.reduce((sum, p) => sum + p.hostAmount, 0);

    // Check for existing pending payouts
    const existingPayouts = await ctx.db
      .query("payouts")
      .withIndex("by_host", (q) => q.eq("hostId", userId))
      .collect();

    const pendingPayouts = existingPayouts.filter(p => p.status === "pending" || p.status === "processing");
    const pendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

    const availableAmount = totalHostAmount - pendingAmount;

    if (args.amount > availableAmount) {
      throw new Error(`Insufficient funds. Available: $${availableAmount.toFixed(2)}`);
    }

    const payoutId = await ctx.db.insert("payouts", {
      hostId: userId,
      amount: args.amount,
      status: "pending",
      requestedAt: Date.now(),
    });

    return { payoutId, amount: args.amount };
  },
});

// Get host payouts
export const getHostPayouts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const payouts = await ctx.db
      .query("payouts")
      .withIndex("by_host", (q) => q.eq("hostId", userId))
      .collect();

    return payouts.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});

// Get host earnings summary
export const getHostEarnings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        totalEarnings: 0,
        availableBalance: 0,
        pendingPayouts: 0,
        completedPayouts: 0,
      };
    }

    // Get all tournaments owned by user
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    let totalEarnings = 0;
    for (const tournament of tournaments) {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect();
      
      const completedPayments = payments.filter(p => p.status === "completed");
      totalEarnings += completedPayments.reduce((sum, p) => sum + p.hostAmount, 0);
    }

    // Get payouts
    const payouts = await ctx.db
      .query("payouts")
      .withIndex("by_host", (q) => q.eq("hostId", userId))
      .collect();

    const pendingPayouts = payouts
      .filter(p => p.status === "pending" || p.status === "processing")
      .reduce((sum, p) => sum + p.amount, 0);

    const completedPayouts = payouts
      .filter(p => p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = totalEarnings - pendingPayouts - completedPayouts;

    return {
      totalEarnings,
      availableBalance,
      pendingPayouts,
      completedPayouts,
    };
  },
});
