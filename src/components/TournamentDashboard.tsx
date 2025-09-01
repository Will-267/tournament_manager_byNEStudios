import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CreateTournamentModal } from "./CreateTournamentModal";
import { TournamentCard } from "./TournamentCard";
import { TournamentView } from "./TournamentView";
import { Id } from "../../convex/_generated/dataModel";

export function TournamentDashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Id<"tournaments"> | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "my-tournaments">("all");

  const tournaments = useQuery(api.tournaments.listTournaments, {});
  const userTournaments = useQuery(api.tournaments.getUserTournaments, {});
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (selectedTournament) {
    return (
      <TournamentView 
        tournamentId={selectedTournament}
        onBack={() => setSelectedTournament(null)}
      />
    );
  }

  const displayTournaments = activeTab === "all" ? tournaments : userTournaments;

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back, {loggedInUser?.name || loggedInUser?.email}!
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
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === "all"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          All Tournaments
        </button>
        <button
          onClick={() => setActiveTab("my-tournaments")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === "my-tournaments"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          My Tournaments
        </button>
      </div>

      {/* Tournament Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {displayTournaments?.map((tournament) => (
          tournament._id && (
            <TournamentCard
              key={tournament._id}
              tournament={tournament}
              onClick={() => setSelectedTournament(tournament._id!)}
            />
          )
        ))}
      </div>

      {displayTournaments?.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <div className="text-gray-400 text-4xl sm:text-6xl mb-2 sm:mb-4">c6</div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
            {activeTab === "all" ? "No tournaments yet" : "You haven't joined any tournaments"}
          </h3>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
            {activeTab === "all" 
              ? "Be the first to create a tournament!" 
              : "Browse all tournaments to find one to join"
            }
          </p>
          {activeTab === "my-tournaments" && (
            <button
              onClick={() => setActiveTab("all")}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Browse All Tournaments 192
            </button>
          )}
        </div>
      )}

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <CreateTournamentModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
