import { Id } from "../../convex/_generated/dataModel";

interface Tournament {
  _id?: Id<"tournaments">;
  name?: string;
  description?: string;
  gameType?: string;
  maxParticipants?: number;
  status?: "upcoming" | "active" | "completed" | "cancelled";
  startDate?: number;
  tournamentType?: "free" | "participants_pay" | "exclusive";
  participantFee?: number;
  spectatorFee?: number;
  participantCount?: number;
  spectatorCount?: number;
  ownerName?: string;
  userRole?: "owner" | "participant" | "spectator";
  userStatus?: "registered" | "paid" | "active" | "kicked";
  registrationDate?: number;
}

interface TournamentCardProps {
  tournament: Tournament;
  onClick: () => void;
}

export function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  if (!tournament._id || !tournament.name) return null;
  const getStatusColor = (status: string | undefined) => {
    if (!status) return "bg-gray-100 text-gray-800";
    switch (status) {
      case "upcoming": return "bg-blue-100 text-blue-800";
      case "active": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-red-100 text-red-800";
    }
  };

  const getTournamentTypeLabel = (type: string | undefined) => {
    if (!type) return "Unknown";
    switch (type) {
      case "free": return "Free";
      case "participants_pay": return "Paid Entry";
      case "exclusive": return "Premium";
      default: return type;
    }
  };

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "TBD";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer p-6"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{tournament.name}</h3>
          <p className="text-sm text-gray-600">by {tournament.ownerName || "Unknown"}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
            {tournament.status}
          </span>
          {tournament.userRole && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {tournament.userRole}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{tournament.description}</p>

      {/* Game Type & Tournament Type */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
          🎮 {tournament.gameType}
        </span>
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
          {getTournamentTypeLabel(tournament.tournamentType)}
        </span>
      </div>

      {/* Pricing */}
      {tournament.tournamentType !== "free" && (
        <div className="mb-4 text-sm">
          {tournament.participantFee && (
            <div className="text-gray-600">
              Entry: <span className="font-semibold text-gray-900">${tournament.participantFee}</span>
            </div>
          )}
          {tournament.spectatorFee && (
            <div className="text-gray-600">
              Spectator: <span className="font-semibold text-gray-900">${tournament.spectatorFee}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
        <div>
          <span className="font-medium">{tournament.participantCount || 0}</span>/{tournament.maxParticipants} players
        </div>
        <div>
          <span className="font-medium">{tournament.spectatorCount || 0}</span> spectators
        </div>
      </div>

      {/* Start Date */}
      <div className="text-sm text-gray-500">
        Starts: {formatDate(tournament.startDate)}
      </div>
    </div>
  );
}
