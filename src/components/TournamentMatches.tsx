import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MatchView } from "./MatchView";
import { toast } from "sonner";

interface TournamentMatchesProps {
  tournamentId: Id<"tournaments">;
}

export function TournamentMatches({ tournamentId }: TournamentMatchesProps) {
  const [selectedMatch, setSelectedMatch] = useState<Id<"matches"> | null>(null);
  
  const matches = useQuery(api.matches.getTournamentMatches, { tournamentId });
  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const loggedInUser = useQuery(api.auth.loggedInUser);
  
  const createMatch = useMutation(api.matches.createMatch);
  const startMatch = useMutation(api.matches.startMatch);

  if (selectedMatch) {
    return (
      <MatchView
        matchId={selectedMatch}
        tournamentId={tournamentId}
        onBack={() => setSelectedMatch(null)}
      />
    );
  }

  const isOwner = tournament?.ownerId === loggedInUser?._id;
  const groupedMatches = matches?.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof matches>) || {};

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "active": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-red-100 text-red-800";
    }
  };

  const handleStartMatch = async (matchId: Id<"matches">) => {
    try {
      await startMatch({ matchId });
      toast.success("Match started!");
    } catch (error: any) {
      toast.error(error.message || "Failed to start match");
    }
  };

  const generateFirstRound = async () => {
    if (!tournament) return;
    
    const participants = tournament.participants.filter(p => p.status === "active");
    if (participants.length < 2) {
      toast.error("Need at least 2 active participants to generate matches");
      return;
    }

    try {
      // Simple pairing for first round
      for (let i = 0; i < participants.length - 1; i += 2) {
        await createMatch({
          tournamentId,
          round: 1,
          matchNumber: Math.floor(i / 2) + 1,
          player1Id: participants[i].userId,
          player2Id: participants[i + 1].userId,
        });
      }
      toast.success("First round matches generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate matches");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tournament Matches</h3>
        {isOwner && Object.keys(groupedMatches).length === 0 && (
          <button
            onClick={generateFirstRound}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Generate First Round
          </button>
        )}
      </div>

      {Object.keys(groupedMatches).length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🏆</div>
          <p>No matches scheduled yet</p>
          {isOwner && (
            <p className="text-sm mt-2">Generate the first round to get started</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMatches)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([round, roundMatches]) => (
              <div key={round} className="bg-white rounded-lg shadow-sm border p-6">
                <h4 className="text-lg font-semibold mb-4">Round {round}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roundMatches.map((match) => (
                    <div
                      key={match._id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedMatch(match._id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-sm text-gray-600">
                          Match {match.matchNumber}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                          {match.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{match.player1Name}</span>
                          {match.score && (
                            <span className="text-lg font-bold">{match.score.player1Score}</span>
                          )}
                        </div>
                        
                        <div className="text-center text-gray-500 text-sm">vs</div>
                        
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{match.player2Name}</span>
                          {match.score && (
                            <span className="text-lg font-bold">{match.score.player2Score}</span>
                          )}
                        </div>
                      </div>

                      {match.winnerName && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm text-green-600 font-medium">
                            Winner: {match.winnerName}
                          </div>
                        </div>
                      )}

                      {isOwner && match.status === "scheduled" && (
                        <div className="mt-3 pt-3 border-t">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartMatch(match._id);
                            }}
                            className="w-full px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                          >
                            Start Match
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
