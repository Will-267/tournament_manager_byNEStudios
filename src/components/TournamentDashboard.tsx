import { useState, useEffect } from "react";
import { CreateTournamentModal } from "./CreateTournamentModal";
import { TournamentCard } from "./TournamentCard";
import { TournamentView } from "./TournamentView";
import { Id } from "../../convex/_generated/dataModel";

export function TournamentDashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Id<"tournaments"> | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "my-tournaments">("all");

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // For demo, all tournaments are shown; userTournaments and loggedInUser are omitted

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/tournaments");
        const data = await res.json();
        setTournaments(data);
      } catch (e) {
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, [showCreateModal]);

  if (selectedTournament) {
    return (
      <TournamentView 
        tournamentId={selectedTournament}
        onBack={() => setSelectedTournament(null)}
      />
    );
  }

  // Only "all" tab is supported in this demo
  const displayTournaments = tournaments;

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Tournament Dashboard
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Manage your tournaments and compete with others</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition-colors shadow-sm"
        >
          Create Tournament
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-4 sm:mb-6 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto">
        <button
          className="px-4 py-2 rounded-md font-medium transition-colors bg-white text-blue-600 shadow-sm"
          disabled
        >
          All Tournaments
        </button>
      </div>

      {/* Tournament Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">Loading tournaments...</div>
        ) : displayTournaments?.length > 0 ? (
          displayTournaments.map((tournament) => (
            tournament.id && (
              <TournamentCard
                key={tournament.id}
                tournament={{ ...tournament, _id: tournament.id }}
                onClick={() => setSelectedTournament(tournament.id)}
              />
            )
          ))
        ) : (
          <div className="col-span-full text-center py-8 sm:py-12">
            <div className="text-gray-400 text-4xl sm:text-6xl mb-2 sm:mb-4">🏆</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              No tournaments yet
            </h3>
            <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
              Be the first to create a tournament!
            </p>
          </div>
        )}
      </div>

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <CreateTournamentModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
