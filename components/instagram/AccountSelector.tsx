"use client";

import { Instagram, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  username: string;
  profilePicture: string | null;
  accountType: string;
  isDefault: boolean;
  facebookPage: {
    id: string;
    name: string;
  };
}

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccountId: string;
  onSelect: (accountId: string) => void;
  disabled?: boolean;
}

export function AccountSelector({
  accounts,
  selectedAccountId,
  onSelect,
  disabled = false,
}: AccountSelectorProps) {
  console.log("accounts", accounts);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // If only one account, just show it without dropdown
  if (accounts.length === 1) {
    const account = accounts[0];
    return (
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Publishing to
        </p>
        <div className="flex items-center gap-3">
          {account.profilePicture ? (
            <img
              src={account.profilePicture}
              alt={account.username}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">
              @{account.username}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {account.accountType.replace("_", " ")} Account
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Multiple accounts - show dropdown selector
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
        Select account to publish to
      </p>
      <div className="relative">
        <select
          value={selectedAccountId}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-12 pr-10",
            "text-sm font-medium text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "cursor-pointer"
          )}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              @{account.username} {account.isDefault ? "(default)" : ""} - {account.facebookPage.name}
            </option>
          ))}
        </select>

        {/* Profile picture overlay */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {selectedAccount?.profilePicture ? (
            <img
              src={selectedAccount.profilePicture}
              alt={selectedAccount.username}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Instagram className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Account info below */}
      {selectedAccount && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <span className="capitalize">
            {selectedAccount.accountType.replace("_", " ")}
          </span>
          <span>|</span>
          <span>{selectedAccount.facebookPage.name}</span>
          {selectedAccount.isDefault && (
            <>
              <span>|</span>
              <span className="text-purple-600 font-medium">Default</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
