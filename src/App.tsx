import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { TournamentDashboard } from "./components/TournamentDashboard";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">TM</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Tournament Manager</h2>
          <span className="text-sm text-gray-500 font-medium">by NE Studios</span>
        </div>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Authenticated>
        <TournamentDashboard />
      </Authenticated>
      
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[600px] p-8">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to Tournament Manager
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                Create, manage, and participate in competitive tournaments
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-sm">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="text-blue-600 font-semibold mb-2">🏆 Host Tournaments</div>
                  <p className="text-gray-600">Create and manage tournaments for any game</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="text-green-600 font-semibold mb-2">🎮 Play Games</div>
                  <p className="text-gray-600">Built-in chess with video streaming</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="text-purple-600 font-semibold mb-2">💰 Monetize</div>
                  <p className="text-gray-600">Charge entry fees and manage payouts</p>
                </div>
              </div>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}
