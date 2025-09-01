import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface AdminPanelProps {
  tournamentId: Id<"tournaments">;
  isOwner: boolean;
}

export function AdminPanel({ tournamentId, isOwner }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"users" | "settings" | "danger">("users");
  
  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const kickUser = useMutation(api.admin.kickUserFromTournament);
  const updateStatus = useMutation(api.admin.updateTournamentStatus);
  const deleteTournament = useMutation(api.admin.deleteTournament);

  if (!isOwner || !tournament) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Admin access required</div>
      </div>
    );
  }

  const handleKickUser = async (userId: Id<"users">) => {
    try {
      await kickUser({ tournamentId, targetUserId: userId });
      toast.success("User kicked from tournament");
    } catch (error: any) {
      toast.error(error.message || "Failed to kick user");
    }
  };

  const handleStatusUpdate = async (status: "upcoming" | "active" | "completed" | "cancelled") => {
    try {
      await updateStatus({ tournamentId, status });
      toast.success("Tournament status updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleDeleteTournament = async () => {
    if (!confirm("Are you sure you want to delete this tournament? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteTournament({ tournamentId });
      toast.success("Tournament deleted");
      // Navigate back or refresh
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete tournament");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-lg font-semibold">🛠️ Admin Panel</div>
        <div className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
          Owner Only
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {["users", "settings", "danger"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-md font-medium transition-colors capitalize ${
              activeTab === tab
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {activeTab === "users" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Manage Participants</h3>
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
                        participant.status === "kicked" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {participant.status}
                      </span>
                      {participant.status !== "kicked" && (
                        <button
                          onClick={() => handleKickUser(participant.userId)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Manage Spectators</h3>
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
                        spectator.status === "kicked" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {spectator.status}
                      </span>
                      {spectator.status !== "kicked" && (
                        <button
                          onClick={() => handleKickUser(spectator.userId)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Tournament Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {["upcoming", "active", "completed", "cancelled"].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(status as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                      tournament.status === status
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Tournament Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{tournament.participants.length}</div>
                  <div className="text-sm text-gray-600">Total Participants</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{tournament.spectators.length}</div>
                  <div className="text-sm text-gray-600">Total Spectators</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {tournament.participants.filter(p => p.status === "active").length}
                  </div>
                  <div className="text-sm text-gray-600">Active Players</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    ${tournament.prizePool || 0}
                  </div>
                  <div className="text-sm text-gray-600">Prize Pool</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "danger" && (
          <div className="space-y-6">
            <div className="border border-red-200 rounded-lg p-6 bg-red-50">
              <h3 className="text-lg font-semibold text-red-800 mb-4">Danger Zone</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-red-700 mb-2">Delete Tournament</h4>
                  <p className="text-sm text-red-600 mb-4">
                    This will permanently delete the tournament and all associated data. This action cannot be undone.
                  </p>
                  <button
                    onClick={handleDeleteTournament}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Delete Tournament
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
