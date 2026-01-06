"use client";

import { useState, useEffect } from "react";
import {
  Instagram,
  X,
  Check,
  AlertTriangle,
  Image as ImageIcon,
  FileText,
  Hash,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import {
  INSTAGRAM_IMAGE_REQUIREMENTS,
  INSTAGRAM_CAPTION_REQUIREMENTS,
  INSTAGRAM_CAROUSEL_REQUIREMENTS,
} from "@/lib/instagram-validation";

interface PostData {
  id: string;
  caption: string | null;
  hashtags: string[];
  images: Array<{
    id: string;
    width: number;
    height: number;
    aspectRatio: string;
  }>;
}

interface ValidationResult {
  isValid: boolean;
  label: string;
  message: string;
}

interface PublishConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  post: PostData;
}

export function PublishConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  post,
}: PublishConfirmationModalProps) {
  const { account, rateLimit } = useInstagramConnection();
  const [aiConfirmed, setAiConfirmed] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [validations, setValidations] = useState<ValidationResult[]>([]);

  // Run validations when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsValidating(true);
      setAiConfirmed(false);

      // Simulate validation delay for UX
      const timer = setTimeout(() => {
        const results: ValidationResult[] = [];

        // Image validation
        const imageCount = post.images.length;
        if (imageCount === 0) {
          results.push({
            isValid: false,
            label: "Images",
            message: "No images selected",
          });
        } else if (imageCount > INSTAGRAM_CAROUSEL_REQUIREMENTS.maxItems) {
          results.push({
            isValid: false,
            label: "Images",
            message: `Too many images (${imageCount}/${INSTAGRAM_CAROUSEL_REQUIREMENTS.maxItems})`,
          });
        } else {
          const isCarousel = imageCount > 1;
          const firstImage = post.images[0];
          const validDimensions =
            firstImage.width >= INSTAGRAM_IMAGE_REQUIREMENTS.dimensions.minWidth &&
            firstImage.height >= INSTAGRAM_IMAGE_REQUIREMENTS.dimensions.minHeight;

          if (!validDimensions) {
            results.push({
              isValid: false,
              label: "Image dimensions",
              message: `Image too small (min ${INSTAGRAM_IMAGE_REQUIREMENTS.dimensions.minWidth}x${INSTAGRAM_IMAGE_REQUIREMENTS.dimensions.minHeight}px)`,
            });
          } else {
            results.push({
              isValid: true,
              label: "Images",
              message: isCarousel
                ? `${imageCount} images (carousel)`
                : `1 image (${firstImage.width}x${firstImage.height}px)`,
            });
          }
        }

        // Caption validation
        const captionLength = post.caption?.length || 0;
        if (captionLength > INSTAGRAM_CAPTION_REQUIREMENTS.maxLength) {
          results.push({
            isValid: false,
            label: "Caption",
            message: `Too long (${captionLength}/${INSTAGRAM_CAPTION_REQUIREMENTS.maxLength} chars)`,
          });
        } else {
          results.push({
            isValid: true,
            label: "Caption",
            message: captionLength > 0
              ? `${captionLength} characters`
              : "No caption (optional)",
          });
        }

        // Hashtag validation
        const hashtagCount = post.hashtags.length;
        if (hashtagCount > INSTAGRAM_CAPTION_REQUIREMENTS.maxHashtags) {
          results.push({
            isValid: false,
            label: "Hashtags",
            message: `Too many (${hashtagCount}/${INSTAGRAM_CAPTION_REQUIREMENTS.maxHashtags})`,
          });
        } else {
          results.push({
            isValid: true,
            label: "Hashtags",
            message: `${hashtagCount} hashtags`,
          });
        }

        // Rate limit validation
        const remaining = rateLimit?.remaining ?? 25;
        if (remaining <= 0) {
          results.push({
            isValid: false,
            label: "Daily limit",
            message: "No posts remaining today",
          });
        } else {
          results.push({
            isValid: true,
            label: "Daily limit",
            message: `${rateLimit?.used || 0}/25 posts today`,
          });
        }

        setValidations(results);
        setIsValidating(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, post, rateLimit]);

  const allValid = validations.every((v) => v.isValid);
  const canPublish = allValid && aiConfirmed;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            Publish to Instagram
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Connected Account */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              Publishing to
            </p>
            <div className="flex items-center gap-3">
              {account?.profilePicture ? (
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
                  @{account?.username}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {account?.accountType.replace("_", " ")} Account
                </p>
              </div>
            </div>
          </div>

          {/* Validations */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Verification
            </p>
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              {isValidating ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Validating...</span>
                </div>
              ) : (
                validations.map((validation, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm"
                  >
                    {validation.isValid ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span
                      className={
                        validation.isValid ? "text-gray-700" : "text-red-700"
                      }
                    >
                      <span className="font-medium">{validation.label}:</span>{" "}
                      {validation.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Content Confirmation */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aiConfirmed}
                onChange={(e) => setAiConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-pink-500 focus:ring-pink-500"
              />
              <div className="text-sm">
                <p className="font-medium text-amber-800">
                  AI-Generated Content Confirmation
                </p>
                <p className="text-amber-700 mt-0.5">
                  I confirm this content was generated with AI and I will label
                  it appropriately according to Instagram&apos;s policies on
                  AI-generated content.
                </p>
              </div>
            </label>
          </div>

          {/* Validation Errors */}
          {!isValidating && !allValid && (
            <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <p className="font-medium">Cannot publish</p>
              <p>Please fix the validation errors above before publishing.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!canPublish || isValidating}
            className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Instagram className="w-4 h-4" />
            Publish now
          </Button>
        </div>
      </div>
    </div>
  );
}
