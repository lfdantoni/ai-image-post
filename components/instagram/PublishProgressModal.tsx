"use client";

import { Instagram, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PublishingStep } from "@/hooks/usePublishToInstagram";

interface PublishingProgress {
  step: PublishingStep;
  progress: number;
  message: string;
  containerStatus?: string;
}

interface PublishProgressModalProps {
  isOpen: boolean;
  progress: PublishingProgress;
}

const STEPS: Array<{
  key: PublishingStep;
  label: string;
  description: string;
}> = [
  {
    key: "validating",
    label: "Preparing image",
    description: "Validating content and generating URLs",
  },
  {
    key: "creating_container",
    label: "Uploading to Instagram",
    description: "Creating media container",
  },
  {
    key: "processing",
    label: "Processing",
    description: "Instagram is processing your media",
  },
  {
    key: "publishing",
    label: "Publishing post",
    description: "Making your post live",
  },
  {
    key: "completed",
    label: "Getting link",
    description: "Retrieving post URL",
  },
];

function getStepStatus(
  currentStep: PublishingStep,
  stepKey: PublishingStep
): "completed" | "current" | "pending" | "error" {
  if (currentStep === "error") {
    const currentIndex = STEPS.findIndex((s) => s.key === stepKey);
    const errorIndex = STEPS.length; // Assume error happened at current step
    if (currentIndex < errorIndex) return "completed";
    return "error";
  }

  const stepOrder: PublishingStep[] = [
    "validating",
    "creating_container",
    "uploading",
    "processing",
    "publishing",
    "completed",
  ];

  const currentIndex = stepOrder.indexOf(currentStep);
  const stepIndex = stepOrder.indexOf(stepKey);

  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "current";
  return "pending";
}

export function PublishProgressModal({
  isOpen,
  progress,
}: PublishProgressModalProps) {
  if (!isOpen) return null;

  const isError = progress.step === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            {isError ? "Publishing Failed" : "Publishing to Instagram..."}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Progress Icon */}
          <div className="flex justify-center mb-6">
            {isError ? (
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            ) : progress.step === "completed" ? (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            {STEPS.map((step) => {
              const status = getStepStatus(progress.step, step.key);

              return (
                <div key={step.key} className="flex items-center gap-3">
                  {/* Status Icon */}
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                      status === "completed" && "bg-green-100",
                      status === "current" && "bg-pink-100",
                      status === "pending" && "bg-gray-100",
                      status === "error" && "bg-red-100"
                    )}
                  >
                    {status === "completed" && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                    {status === "current" && (
                      <Loader2 className="w-4 h-4 text-pink-600 animate-spin" />
                    )}
                    {status === "pending" && (
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                    )}
                    {status === "error" && (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        status === "completed" && "text-green-700",
                        status === "current" && "text-gray-900",
                        status === "pending" && "text-gray-400",
                        status === "error" && "text-red-700"
                      )}
                    >
                      {step.label}
                    </p>
                    {status === "current" && (
                      <p className="text-xs text-gray-500">{step.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          {!isError && (
            <div className="space-y-2">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-500">
                {progress.progress}% complete
              </p>
            </div>
          )}

          {/* Container Status */}
          {progress.containerStatus && progress.step === "processing" && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Status: {progress.containerStatus}
            </p>
          )}

          {/* Warning */}
          {!isError && progress.step !== "completed" && (
            <p className="text-center text-xs text-gray-400 mt-4">
              Please don&apos;t close this window
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
