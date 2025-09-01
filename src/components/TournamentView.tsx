
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ChatPanel } from "./ChatPanel";
import { TournamentMatches } from "./TournamentMatches";
import { AdminPanel } from "./AdminPanel";
import { PaymentModal } from "./PaymentModal";


interface TournamentViewProps {
  tournamentId: string;
  onBack: () => void;
}

export function TournamentView({ tournamentId, onBack }: TournamentViewProps) {
  const [tournament, setTournament] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "participants" | "matches" | "chat" | "admin">("overview");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState<{
    role: "participant" | "spectator";
    amount: number;
    paymentType: "participant_fee" | "spectator_fee";
  } | null>(null);
  const [userRegistration, setUserRegistration] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}`)
      .then(res => res.json())
      .then(data => {
        setTournament(data);
        // Simulate user info for demo; replace with real auth
        const userEmail = localStorage.getItem("userEmail") || "demo@user.com";
        const reg =
          data.participants.find((p: any) => p.userEmail === userEmail) ||
          data.spectators.find((s: any) => s.userEmail === userEmail);
        setUserRegistration(reg);
        setIsOwner(data.ownerEmail === userEmail);
      })
      .catch(() => setTournament(null));
  }, [tournamentId, showPaymentModal]);

  function getStatusColor(status: string) {
    switch (status) {
      case "upcoming": return "bg-blue-100 text-blue-800";
      case "ongoing": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-200 text-gray-700";
      default: return "bg-gray-100 text-gray-600";
    }
  }

  function formatDate(ts: number) {
    const d = new Date(ts);
    return d.toLocaleString();
  }

  const handleRegister = async (role: "participant" | "spectator") => {
    if (!tournament) return;
    setIsRegistering(true);
    try {
      let paymentType: "participant_fee" | "spectator_fee" = "participant_fee";
      let amount = 0;
      if (role === "participant" && tournament.tournamentType !== "free") {
        paymentType = "participant_fee";
        amount = tournament.participantFee || 0;
      } else if (role === "spectator" && tournament.tournamentType === "exclusive") {
        paymentType = "spectator_fee";
        amount = tournament.spectatorFee || 0;
      }
      if (amount > 0) {
        setPendingRegistration({ role, amount, paymentType });
        setShowPaymentModal(true);
        return;
      }
      // Free registration
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Registration failed");
      toast.success("Registered successfully!");
      setUserRegistration({ role, status: "active" });
      // Optionally refetch tournament
      fetch(`/api/tournaments/${tournamentId}`)
        .then(res => res.json())
        .then(setTournament);
    } catch (e) {
      toast.error("Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPendingRegistration(null);
    toast.success("Payment successful! Registered.");
    // Optionally refetch tournament
    fetch(`/api/tournaments/${tournamentId}`)
      .then(res => res.json())
      .then(setTournament);
  };

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <div className="text-lg text-gray-500 mb-2">Loading tournament...</div>
        <button onClick={onBack} className="text-blue-600 underline">Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-2 sm:p-6">
      <button onClick={onBack} className="mb-4 text-blue-600 hover:underline">← Back</button>
      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{tournament.name}</h1>
        <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(tournament.status)}`}>
          {tournament.status}
        </span>
      </div>
      <p className="text-gray-600 text-sm sm:text-base mb-2">Hosted by {tournament.ownerName}</p>

      {/* Registration Buttons */}
      {!isOwner && !userRegistration && tournament.status === "upcoming" && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          {tournament.participants.length < tournament.maxParticipants && (
            <button
              onClick={() => handleRegister("participant")}
              disabled={isRegistering}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 sm:px-6 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isRegistering ? "Registering..." : "Join as Player"}
              {tournament.tournamentType !== "free" && tournament.participantFee ? (
                <span className="ml-1">(${tournament.participantFee})</span>
              ) : null}
            </button>
          )}
          <button
            onClick={() => handleRegister("spectator")}
            disabled={isRegistering}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 sm:px-6 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {isRegistering ? "Registering..." : "Watch"}
            {tournament.tournamentType === "exclusive" && tournament.spectatorFee ? (
              <span className="ml-1">(${tournament.spectatorFee})</span>
            ) : null}
          </button>
        </div>
      )}
      {userRegistration && (
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 sm:px-3 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-medium">
            {userRegistration.role} | {userRegistration.status}
          </span>
        </div>
      )}

      {/* Tournament Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
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
      <div className="flex space-x-1 mb-4 sm:mb-6 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto">
        {[
          "overview",
          "participants",
          "matches",
          "chat",
          ...(isOwner ? ["admin"] : []),
        ].map((tab) => (
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
      <div className="bg-white rounded-lg shadow-sm border p-2 sm:p-6">
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
                {tournament.participants.map((participant: any) => (
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
                {tournament.spectators.map((spectator: any) => (
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
