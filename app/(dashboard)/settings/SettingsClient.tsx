"use client";

import { useState } from "react";
import { Settings, Instagram, Cloud, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { InstagramSettings } from "@/components/settings/InstagramSettings";
import { DriveSettings } from "@/components/settings/DriveSettings";

type SettingsTab = "instagram" | "drive";

const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Instagram }> = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "drive", label: "Google Drive", icon: Cloud },
];

export function SettingsClient() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("instagram");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Settings
          </h1>
          <p className="text-sm text-gray-500">
            Manage your integrations and preferences
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar / Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                    : "text-gray-600 hover:bg-white hover:text-gray-900"
                )}
              >
                <tab.icon className={cn(
                  "w-5 h-5",
                  activeTab === tab.id ? "text-primary" : "text-gray-400"
                )} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {activeTab === "instagram" && (
                  <>
                    <Instagram className="w-5 h-5 text-pink-500" />
                    Instagram Integration
                  </>
                )}
                {activeTab === "drive" && (
                  <>
                    <Cloud className="w-5 h-5 text-blue-500" />
                    Google Drive Integration
                  </>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {activeTab === "instagram" &&
                  "Connect your Instagram Business or Creator account to publish posts directly from AIGram."}
                {activeTab === "drive" &&
                  "Connect your Google Drive to export optimized images for Instagram."}
              </p>
            </div>

            {activeTab === "instagram" && <InstagramSettings />}
            {activeTab === "drive" && <DriveSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
