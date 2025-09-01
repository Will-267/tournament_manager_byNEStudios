import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { ChatPanel } from "./ChatPanel";
import { TournamentMatches } from "./TournamentMatches";
import { AdminPanel } from "./AdminPanel";
import { PaymentModal } from "./PaymentModal";

interface TournamentViewProps {
  tournamentId: Id<"tournaments">;
  onBack: () => void;
}

export function TournamentView({ tournamentId, onBack }: TournamentViewProps) {
  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const registerForTournament = useMutation(api.tournaments.registerForTournament);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "participants" | "matches" | "chat" | "admin">("overview");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState<{
    role: "participant" | "spectator";
    amount: number;
    paymentType: "participant_fee" | "spectator_fee";
  } | null>(null);

  if (!tournament) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userRegistration = tournament.participants.find(p => p.userId === loggedInUser?._id) ||
                          tournament.spectators.find(s => s.userId === loggedInUser?._id);
  
  const isOwner = tournament.ownerId === loggedInUser?._id;
  const isRegistered = !!userRegistration;

  const handleRegister = async (role: "participant" | "spectator") => {
    if (!loggedInUser) return;
    
    setIsRegistering(true);
    try {
      const result = await registerForTournament({
        tournamentId,
        role,
      });
      
      if (result.paymentRequired) {
        // Show payment modal
        setPendingRegistration({
          role,
          amount: result.paymentAmount,
          paymentType: role === "participant" ? "participant_fee" : "spectator_fee",
        });
        setShowPaymentModal(true);
        toast.info(`Registration initiated. Payment of ${result.paymentAmount} required.`);
      } else {
        toast.success("Registration successful!");
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPendingRegistration(null);
    toast.success("Payment completed! You are now registered for the tournament.");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-blue-100 text-blue-800";
      case "active": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-red-100 text-red-800";
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 text-2xl"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tournament.status)}`}>
              {tournament.status}
            </span>
          </div>
          <p className="text-gray-600">Hosted by {tournament.ownerName}</p>
        </div>
        
        {/* Registration Buttons */}
        {!isOwner && !isRegistered && tournament.status === "upcoming" && (
          <div className="flex gap-2">
            {tournament.participants.length < tournament.maxParticipants && (
              <button
                onClick={() => handleRegister("participant")}
                disabled={isRegistering}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {isRegistering ? "Registering..." : "Join as Player"}
                {tournament.tournamentType !== "free" && tournament.participantFee && (
                  <span className="ml-1">(${tournament.participantFee})</span>
                )}
              </button>
            )}
            <button
              onClick={() => handleRegister("spectator")}
              disabled={isRegistering}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isRegistering ? "Registering..." : "Watch"}
              {tournament.tournamentType === "exclusive" && tournament.spectatorFee && (
                <span className="ml-1">(${tournament.spectatorFee})</span>
              )}
            </button>
          </div>
        )}

        {userRegistration && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {userRegistration.role} • {userRegistration.status}
            </span>
          </div>
        )}
      </div>

      {/* Tournament Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{tournament.participants.length}</div>
          <div className="text-sm text-gray-600">Players</div>
          <div className="text-xs text-gray-500">of {tournament.maxParticipants} max</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{tournament.spectators.length}</div>
          <div className="text-sm text-gray-600">Spectators</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-purple-600">🎮</div>
          <div className="text-sm text-gray-600">{tournament.gameType}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-orange-600">
            {tournament.prizePool ? `$${tournament.prizePool}` : "—"}
          </div>
          <div className="text-sm text-gray-600">Prize Pool</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {["overview", "participants", "matches", "chat", ...(isOwner ? ["admin"] : [])].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-md font-medium transition-colors capitalize ${
              activeTab === tab
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab === "admin" ? "🛠️ Admin" : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <p className="text-gray-700">{tournament.description}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Tournament Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Start Date:</strong> {formatDate(tournament.startDate)}
                </div>
                <div>
                  <strong>Game Type:</strong> {tournament.gameType}
                </div>
                <div>
                  <strong>Max Players:</strong> {tournament.maxParticipants}
                </div>
                <div>
                  <strong>Tournament Type:</strong> {
                    tournament.tournamentType === "free" ? "Free for All" :
                    tournament.tournamentType === "participants_pay" ? "Paid Entry" :
                    "Premium"
                  }
                </div>
                {tournament.isVideoStreamEnabled && (
                  <div>
                    <strong>Video Streaming:</strong> Enabled
                  </div>
                )}
              </div>
            </div>

            {tournament.rules && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Rules & Instructions</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-gray-700">{tournament.rules}</pre>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "participants" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Players ({tournament.participants.length})</h3>
              <div className="space-y-2">
                {tournament.participants.map((participant) => (
                  <div key={participant._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{participant.userName}</div>
                      <div className="text-sm text-gray-600">{participant.userEmail}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        participant.status === "active" ? "bg-green-100 text-green-800" :
                        participant.status === "paid" ? "bg-blue-100 text-blue-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {participant.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Spectators ({tournament.spectators.length})</h3>
              <div className="space-y-2">
                {tournament.spectators.map((spectator) => (
                  <div key={spectator._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{spectator.userName}</div>
                      <div className="text-sm text-gray-600">{spectator.userEmail}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        spectator.status === "active" ? "bg-green-100 text-green-800" :
                        spectator.status === "paid" ? "bg-blue-100 text-blue-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {spectator.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "matches" && (
          <TournamentMatches tournamentId={tournamentId} />
        )}

        {activeTab === "chat" && (
          <ChatPanel tournamentId={tournamentId} />
        )}

        {activeTab === "admin" && (
          <AdminPanel tournamentId={tournamentId} isOwner={isOwner} />
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && pendingRegistration && (
        <PaymentModal
          tournamentId={tournamentId}
          paymentType={pendingRegistration.paymentType}
          amount={pendingRegistration.amount}
          onClose={() => {
            setShowPaymentModal(false);
            setPendingRegistration(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
