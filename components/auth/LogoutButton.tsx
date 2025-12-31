"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface LogoutButtonProps {
  variant?: "button" | "icon";
}

export function LogoutButton({ variant = "button" }: LogoutButtonProps) {
  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleLogout}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="Cerrar sesión"
      >
        <LogOut className="w-5 h-5" />
      </button>
    );
  }

  return (
    <Button variant="outline" onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4" />}>
      Cerrar sesión
    </Button>
  );
}
