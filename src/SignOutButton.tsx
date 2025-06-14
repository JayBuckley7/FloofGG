"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  const handleClick = async () => {
    if (!navigator.onLine) {
      try {
        localStorage.removeItem("convexAuth");
      } catch (err) {
        console.error("Failed to clear auth state", err);
      }
    }
    try {
      await signOut();
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-all duration-200 hover:shadow-sm"
      onClick={() => void handleClick()}
    >
      Sign Out
    </button>
  );
}
