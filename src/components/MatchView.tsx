import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ChessGame } from "./ChessGame";

interface MatchViewProps {
  matchId: Id<"matches">;
  tournamentId: Id<"tournaments">;
  onBack: () => void;
}

export function MatchView({ matchId, tournamentId, onBack }: MatchViewProps) {
  const match = useQuery(api.matches.getMatch, { matchId });
  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (!match || !tournament) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isPlayer = match.player1Id === loggedInUser?._id || match.player2Id === loggedInUser?._id;
  const isSpectator = !isPlayer;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800";
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
            <h1 className="text-3xl font-bold text-gray-900">
              {match.player1Name} vs {match.player2Name}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(match.status)}`}>
              {match.status}
            </span>
          </div>
          <p className="text-gray-600">
            Round {match.round} • Match {match.matchNumber} • {tournament.name}
          </p>
        </div>
      </div>

      {/* Match Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-lg font-semibold text-blue-600">{match.player1Name}</div>
          <div className="text-sm text-gray-600">Player 1</div>
          {match.score && (
            <div className="text-2xl font-bold mt-2">{match.score.player1Score}</div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
          <div className="text-lg font-semibold text-gray-600">VS</div>
          <div className="text-sm text-gray-500">
            {match.status === "completed" && match.winnerName && (
              <div className="mt-2">
                <div className="text-xs text-gray-500">Winner</div>
                <div className="font-semibold text-green-600">{match.winnerName}</div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-lg font-semibold text-purple-600">{match.player2Name}</div>
          <div className="text-sm text-gray-600">Player 2</div>
          {match.score && (
            <div className="text-2xl font-bold mt-2">{match.score.player2Score}</div>
          )}
        </div>
      </div>

      {/* Game Content */}
      {tournament.gameType === "chess" && match.status !== "scheduled" ? (
        <ChessGame 
          matchId={matchId} 
          tournamentId={tournamentId}
          isSpectator={isSpectator}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {match.status === "scheduled" ? "Match Not Started" : "Game in Progress"}
            </h3>
            <p className="text-gray-600">
              {match.status === "scheduled" 
                ? "This match will begin when both players are ready"
                : `${tournament.gameType} match is currently active`
              }
            </p>
            {match.startTime && (
              <p className="text-sm text-gray-500 mt-2">
                Started: {new Date(match.startTime).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
