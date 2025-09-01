import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface CreateTournamentModalProps {
  onClose: () => void;
}

export function CreateTournamentModal({ onClose }: CreateTournamentModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    gameType: "chess",
    maxParticipants: 8,
    startDate: "",
    tournamentType: "free" as "free" | "participants_pay" | "exclusive",
    participantFee: 0,
    spectatorFee: 0,
    rules: "",
    prizePool: 0,
    isVideoStreamEnabled: true,
  });

  const createTournament = useMutation(api.tournaments.createTournament);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const startDate = new Date(formData.startDate).getTime();
      
      await createTournament({
        name: formData.name,
        description: formData.description,
        gameType: formData.gameType,
        maxParticipants: formData.maxParticipants,
        startDate,
        tournamentType: formData.tournamentType,
        participantFee: formData.tournamentType !== "free" ? formData.participantFee : undefined,
        spectatorFee: formData.tournamentType === "exclusive" ? formData.spectatorFee : undefined,
        rules: formData.rules || undefined,
        prizePool: formData.prizePool || undefined,
        isVideoStreamEnabled: formData.isVideoStreamEnabled,
      });

      toast.success("Tournament created successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to create tournament");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-3 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create Tournament</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter tournament name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Game Type *
                </label>
                <select
                  value={formData.gameType}
                  onChange={(e) => setFormData({ ...formData, gameType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="chess">Chess</option>
                  <option value="poker">Poker</option>
                  <option value="esports">Esports</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your tournament"
              />
            </div>

            {/* Tournament Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Participants *
                </label>
                <input
                  type="number"
                  required
                  min="2"
                  max="64"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Tournament Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tournament Type *
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tournamentType"
                    value="free"
                    checked={formData.tournamentType === "free"}
                    onChange={(e) => setFormData({ ...formData, tournamentType: e.target.value as any })}
                    className="mr-2"
                  />
                  <span>Free for All - No entry fees</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tournamentType"
                    value="participants_pay"
                    checked={formData.tournamentType === "participants_pay"}
                    onChange={(e) => setFormData({ ...formData, tournamentType: e.target.value as any })}
                    className="mr-2"
                  />
                  <span>Participants Pay - Only players pay entry fee</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tournamentType"
                    value="exclusive"
                    checked={formData.tournamentType === "exclusive"}
                    onChange={(e) => setFormData({ ...formData, tournamentType: e.target.value as any })}
                    className="mr-2"
                  />
                  <span>Exclusive - Both participants and spectators pay</span>
                </label>
              </div>
            </div>

            {/* Pricing */}
            {formData.tournamentType !== "free" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Participant Fee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.participantFee}
                    onChange={(e) => setFormData({ ...formData, participantFee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {formData.tournamentType === "exclusive" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spectator Fee ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.spectatorFee}
                      onChange={(e) => setFormData({ ...formData, spectatorFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Optional Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prize Pool ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.prizePool}
                  onChange={(e) => setFormData({ ...formData, prizePool: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isVideoStreamEnabled}
                    onChange={(e) => setFormData({ ...formData, isVideoStreamEnabled: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Video Streaming</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rules & Instructions
              </label>
              <textarea
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter tournament rules and instructions"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Tournament"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
