"use client";

import { useState, useEffect, useMemo, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import copy from "copy-to-clipboard";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Sparkles,
  LayoutGrid,
  Image as ImageIcon,
  Copy,
  Check,
  Save,
  Images,
  FileText,
  Trash2,
  Edit3,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { InstagramPostPreview } from "@/components/preview/InstagramPostPreview";
import { CarouselPreview } from "@/components/preview/CarouselPreview";
import { InstagramGridPreview } from "@/components/preview/InstagramGridPreview";
import { CaptionGenerator } from "@/components/ai/CaptionGenerator";
import { HashtagGenerator } from "@/components/ai/HashtagGenerator";
import { AuthenticatedImage } from "@/components/gallery/AuthenticatedImage";
import { ImageData } from "@/types";
import {
  PublishToInstagramButton,
  PublishConfirmationModal,
  PublishProgressModal,
  PublishSuccessModal,
  PublishedPostsSection,
  PublishedPostDetail,
} from "@/components/instagram";
import { usePublishToInstagram } from "@/hooks/usePublishToInstagram";

type ViewMode = "feed" | "grid" | "carousel";

interface Draft {
  id: string;
  type: "SINGLE" | "CAROUSEL";
  caption: string | null;
  hashtags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  images: Array<{
    id: string;
    order: number;
    image: ImageData;
  }>;
}

function CreatePostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const imageIds = searchParams.get("images")?.split(",").filter(Boolean) || [];
  const editPostId = searchParams.get("postId");
  const publishedPostId = searchParams.get("publishedPostId");
   
  const [images, setImages] = useState<ImageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("feed");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [showCaptionGenerator, setShowCaptionGenerator] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | null>(editPostId);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [originalPostData, setOriginalPostData] = useState<{
    caption: string;
    hashtags: string[];
    imageIds: string[];
  } | null>(null);

  // Instagram publish state
  const [showPublishConfirmation, setShowPublishConfirmation] = useState(false);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const {
    isPublishing,
    progress,
    error: publishError,
    result: publishResult,
    publish,
    reset: resetPublish,
  } = usePublishToInstagram();

  // Sync currentPostId with editPostId when it changes
  useEffect(() => {
    if (editPostId) {
      setCurrentPostId(editPostId);
    } else {
      // If postId is removed from URL, clear currentPostId
      setCurrentPostId(null);
    }

    // If there are no images or postId, reset the complete state
    if (!editPostId && imageIds.length === 0) {
      setImages([]);
      setCaption("");
      setHashtags([]);
      setOriginalPostData(null);
    }
  }, [editPostId, imageIds.length]);

  // Load drafts
  const loadDrafts = useCallback(async () => {
    setIsLoadingDrafts(true);
    try {
      const response = await fetch("/api/posts?status=DRAFT");
      if (response.ok) {
        const data = await response.json();
        setDrafts(data.posts || []);
      }
    } catch (error) {
      console.error("Failed to load drafts:", error);
    } finally {
      setIsLoadingDrafts(false);
    }
  }, []);

  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Load existing post if editing
  useEffect(() => {
    const loadPost = async () => {
      if (!editPostId) {
        setOriginalPostData(null);
        return;
      }

      try {
        const response = await fetch(`/api/posts/${editPostId}`);
        if (response.ok) {
          const data = await response.json();
          const post = data.post;
          if (post) {
            setCurrentPostId(post.id); // Set the loaded post ID
            const loadedCaption = post.caption || "";
            const loadedHashtags = post.hashtags || [];
            setCaption(loadedCaption);
            setHashtags(loadedHashtags);
            // Load images from post
            const postImages = post.images.map((pi: { image: ImageData }) => pi.image);
            setImages(postImages);
            
            // Save original data to compare changes
            setOriginalPostData({
              caption: loadedCaption,
              hashtags: loadedHashtags,
              imageIds: postImages.map((img: ImageData) => img.id),
            });
            
            setIsLoading(false); // Marcar como cargado
          }
        }
      } catch (error) {
        console.error("Failed to load post:", error);
        setIsLoading(false);
      }
    };

    loadPost();
  }, [editPostId]);

  // Load images (only if not editing an existing post)
  useEffect(() => {
    const loadImages = async () => {
      // If we're editing a post, don't load images from imageIds
      if (editPostId) {
        setIsLoading(false);
        return;
      }

      if (imageIds.length === 0) {
        setIsLoading(false);
        setOriginalPostData(null); // Clear original data if there are no images
        return;
      }

      try {
        const promises = imageIds.map((id) =>
          fetch(`/api/images/${id}`).then((res) => res.json())
        );
        const results = await Promise.all(promises);
        // API returns { image: {...} }, so we need to extract the image object
        const loadedImages = results
          .map((r) => r.image)
          .filter((img): img is ImageData => img?.id !== undefined);
        setImages(loadedImages);
        
        // Initialize original data as empty when loading new images
        // Only if there's no original data already set
        setOriginalPostData((prev) => {
          if (!prev) {
            return {
              caption: "",
              hashtags: [],
              imageIds: loadedImages.map((img: ImageData) => img.id),
            };
          }
          return prev;
        });
      } catch (error) {
        console.error("Failed to load images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, [imageIds.join(","), editPostId]);

  const firstImage = images[0];
  const prompt = firstImage?.prompt || "";
  const aspectRatio = (firstImage?.aspectRatio || "portrait") as "portrait" | "square" | "landscape";
  
  // Memoize likes count to prevent infinite re-renders
  const likesCount = useMemo(() => Math.floor(Math.random() * 1000) + 100, [firstImage?.id]);

  const handleCaptionGenerated = (newCaption: string) => {
    setCaption(newCaption);
  };

  const handleCopyAll = () => {
    const hashtagsText = hashtags.length > 0 ? "\n\n" + hashtags.map((h) => `#${h}`).join(" ") : "";
    const fullText = caption + hashtagsText;
    copy(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Verificar si hay cambios sin guardar
  const hasUnsavedChanges = useMemo(() => {
    if (!images.length) return false;
    
    const currentImageIds = images.map((img) => img.id).sort().join(",");
    
    if (originalPostData) {
      // Comparar con datos originales si estamos editando
      const originalImageIds = originalPostData.imageIds.sort().join(",");
      return (
        caption !== originalPostData.caption ||
        JSON.stringify(hashtags.sort()) !== JSON.stringify(originalPostData.hashtags.sort()) ||
        currentImageIds !== originalImageIds
      );
    } else {
      // Si no hay post guardado, hay cambios si hay contenido
      return caption.length > 0 || hashtags.length > 0 || images.length > 0;
    }
  }, [caption, hashtags, images, originalPostData]);

  const handleSaveDraft = async () => {
    if (images.length === 0) return;

    setIsSaving(true);
    try {
      const imageIds = images.map((img) => img.id);
      const payload = {
        imageIds,
        caption: caption || undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        status: "DRAFT" as const,
      };

      let response;
      if (currentPostId) {
        // Update existing draft
        response = await fetch(`/api/posts/${currentPostId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new draft
        response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        const data = await response.json();
        const savedPostId = data.post.id;
        setCurrentPostId(savedPostId);
        
        // Update original data after saving
        setOriginalPostData({
          caption: caption,
          hashtags: hashtags,
          imageIds: imageIds,
        });
        
        // Update URL to include postId if it wasn't present
        if (!editPostId && savedPostId) {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set("postId", savedPostId);
          router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
        }
        
        loadDrafts(); // Refresh drafts list
      } else {
        const error = await response.json();
        console.error("Failed to save draft:", error);
      }
    } catch (error) {
      console.error("Failed to save draft:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetState = useCallback(() => {
    setImages([]);
    setCaption("");
    setHashtags([]);
    setCurrentPostId(null);
    setOriginalPostData(null);
    setShowUnsavedChangesModal(false);
    setIsLoading(false);
  }, []);

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedChangesModal(true);
    } else {
      resetState();
      router.push("/create-post");
    }
  }, [hasUnsavedChanges, resetState, router]);

  const handleDiscardAndGoBack = useCallback(() => {
    resetState();
    router.push("/create-post");
  }, [resetState, router]);

  const handleSaveAndGoBack = useCallback(async () => {
    await handleSaveDraft();
    resetState();
    router.push("/create-post");
  }, [handleSaveDraft, resetState, router]);

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const response = await fetch(`/api/posts/${draftId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        loadDrafts();
        if (currentPostId === draftId) {
          setCurrentPostId(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete draft:", error);
    }
  };

  const handleEditDraft = (draft: Draft) => {
    router.push(`/create-post?postId=${draft.id}`);
  };

  // Instagram publish handlers
  const handlePublishClick = () => {
    setShowPublishConfirmation(true);
  };

  const handlePublishConfirm = async () => {
    setShowPublishConfirmation(false);

    // First save the draft if there are unsaved changes or no post ID
    if (!currentPostId || hasUnsavedChanges) {
      await handleSaveDraft();
    }

    // Use the current post ID (might have been set by handleSaveDraft)
    const postIdToPublish = currentPostId;
    if (!postIdToPublish) {
      console.error("No post ID to publish");
      return;
    }

    const result = await publish(postIdToPublish);
    if (result) {
      setShowPublishSuccess(true);
      loadDrafts(); // Refresh drafts after publishing
    } else {
      // Error is handled by the progress modal showing error state
      setShowPublishSuccess(true); // Show the error in success modal
    }
  };

  const handlePublishSuccessClose = () => {
    setShowPublishSuccess(false);
    resetPublish();
  };

  const handleCreateNewPost = () => {
    setShowPublishSuccess(false);
    resetPublish();
    resetState();
    router.push("/create-post");
  };

  const handleViewPublishedPostDetails = (publishedPostId: string) => {
    router.push(`/create-post?publishedPostId=${publishedPostId}`);
  };

  // Determine if we're on the initial page (without parameters)
  const isInitialPage = !editPostId && imageIds.length === 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {!isInitialPage && (
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Create Post</h1>
        </div>
        <Card className="p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No images selected</h3>
          <p className="text-gray-600 mb-4">
            Select images from your gallery to create an Instagram post
          </p>
          <Button onClick={() => router.push("/gallery?select=true&returnTo=/create-post&maxSelection=20")}>
            Select from Gallery
          </Button>
        </Card>

        {/* Drafts section */}
        {drafts.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-medium text-gray-900">Your Drafts</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex gap-3">
                    {draft.images[0] && (
                      <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                        <AuthenticatedImage
                          src={draft.images[0].image.thumbnailUrl || draft.images[0].image.secureUrl}
                          alt="Draft thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {draft.type === "CAROUSEL" ? (
                            <span className="flex items-center gap-1">
                              <Images className="w-3 h-3" />
                              Carousel ({draft.images.length})
                            </span>
                          ) : (
                            "Single Post"
                          )}
                        </span>
                      </div>
                      {draft.caption && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                          {draft.caption}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(draft.updatedAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditDraft(draft)}
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {isLoadingDrafts && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Published Posts Section */}
        <PublishedPostsSection
          limit={6}
          showViewAll={true}
          onViewDetails={handleViewPublishedPostDetails}
        />
      </div>

      {/* Published Post Detail Modal - Needs to be here too because of early return */}
      <Modal
        isOpen={!!publishedPostId}
        onClose={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("publishedPostId");
          router.push(`/create-post?${params.toString()}`);
        }}
        title="Post Details"
        size="xl"
      >
        {publishedPostId && (
          <PublishedPostDetail
            postId={publishedPostId}
            onClose={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("publishedPostId");
              router.push(`/create-post?${params.toString()}`);
            }}
          />
        )}
      </Modal>
    </>
    );
  }

  const isCarousel = images.length > 1;

  return (
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isInitialPage && (
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Create Post</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {currentPostId ? "Update Draft" : "Save Draft"}
          </Button>
          <Button onClick={handleCopyAll}>
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview Section */}
        <div className="space-y-4">
          {/* View mode toggle and change images */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={viewMode === "feed" ? "primary" : "outline"}
                size="sm"
                onClick={() => setViewMode("feed")}
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                Feed
              </Button>
              <Button
                variant={viewMode === "grid" ? "primary" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Grid
              </Button>
              {isCarousel && (
                <Button
                  variant={viewMode === "carousel" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("carousel")}
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Carousel
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/gallery?select=true&returnTo=/create-post&maxSelection=20")}
            >
              <Images className="w-4 h-4 mr-1" />
              Change Images
            </Button>
          </div>

          {/* Preview */}
          <div className="flex justify-center">
            {viewMode === "feed" && (
              <InstagramPostPreview
                imageUrl={firstImage.secureUrl || firstImage.url}
                username="your_username"
                caption={caption}
                hashtags={hashtags}
                likesCount={likesCount}
                aspectRatio={aspectRatio}
              />
            )}
            {viewMode === "grid" && (
              <InstagramGridPreview
                images={images.map((img) => ({
                  id: img.id,
                  thumbnailUrl: img.thumbnailUrl || img.secureUrl,
                  isPlanned: true,
                }))}
                plannedImages={[]}
                username="your_username"
              />
            )}
            {viewMode === "carousel" && isCarousel && (
              <CarouselPreview
                slides={images.map((img) => ({
                  id: img.id,
                  imageUrl: img.secureUrl || img.url,
                }))}
                username="your_username"
                caption={caption}
                hashtags={hashtags}
                likesCount={likesCount}
                aspectRatio={aspectRatio}
              />
            )}
          </div>
        </div>

        {/* Configuration Section */}
        <div className="space-y-6">
          {/* Caption */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Caption</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCaptionGenerator(true)}
                disabled={!prompt}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Generate with AI
              </Button>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your caption..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{caption.length} characters</span>
              <span>Max recommended: 2,200</span>
            </div>
          </Card>

          {/* Hashtags */}
          <Card className="p-4">
            <HashtagGenerator
              prompt={prompt}
              currentHashtags={hashtags}
              onHashtagsChange={setHashtags}
              maxHashtags={30}
            />
          </Card>

          {/* Image info */}
          {firstImage && (
            <Card className="p-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Image Details</h3>
              {prompt && (
                <div>
                  <span className="text-xs text-gray-500">Prompt:</span>
                  <p className="text-sm text-gray-700 line-clamp-3">{prompt}</p>
                </div>
              )}
              {firstImage.aiModel && (
                <div>
                  <span className="text-xs text-gray-500">AI Model:</span>
                  <p className="text-sm text-gray-700">{firstImage.aiModel}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500">Dimensions:</span>
                <p className="text-sm text-gray-700">
                  {firstImage.width} x {firstImage.height} ({firstImage.aspectRatio})
                </p>
              </div>
            </Card>
          )}

          {/* Publish to Instagram */}
          <PublishToInstagramButton
            postId={currentPostId || ""}
            disabled={images.length === 0 || isPublishing}
            onPublish={handlePublishClick}
          />
        </div>
      </div>

      {/* Caption Generator Modal */}
      <CaptionGenerator
        isOpen={showCaptionGenerator}
        onClose={() => setShowCaptionGenerator(false)}
        prompt={prompt}
        imageUrl={firstImage?.secureUrl || firstImage?.url}
        onCaptionGenerated={handleCaptionGenerated}
      />

      {/* Unsaved Changes Modal */}
      <Modal
        isOpen={showUnsavedChangesModal}
        onClose={() => setShowUnsavedChangesModal(false)}
        title="Unsaved changes"
        size="md"
      >
        <div className="p-6 space-y-4">
          <p className="text-gray-600">
            You have unsaved changes. What would you like to do?
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowUnsavedChangesModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              onClick={handleDiscardAndGoBack}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Discard
            </Button>
            <Button
              onClick={handleSaveAndGoBack}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save and exit
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Instagram Publish Confirmation Modal */}
      <PublishConfirmationModal
        isOpen={showPublishConfirmation}
        onClose={() => setShowPublishConfirmation(false)}
        onConfirm={handlePublishConfirm}
        post={{
          id: currentPostId || "",
          caption,
          hashtags,
          images: images.map((img) => ({
            id: img.id,
            width: img.width,
            height: img.height,
            aspectRatio: img.aspectRatio,
          })),
        }}
      />

      {/* Instagram Publish Progress Modal */}
      <PublishProgressModal
        isOpen={isPublishing}
        progress={progress}
      />

      {/* Instagram Publish Success/Error Modal */}
      <PublishSuccessModal
        isOpen={showPublishSuccess}
        onClose={handlePublishSuccessClose}
        onCreateNew={handleCreateNewPost}
        result={publishResult}
        error={publishError}
      />

      {/* Published Post Detail Modal */}
      <Modal
        isOpen={!!publishedPostId}
        onClose={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("publishedPostId");
          router.push(`/create-post?${params.toString()}`);
        }}
        title="Post Details"
        size="xl"
      >
        {publishedPostId && (
          <PublishedPostDetail
            postId={publishedPostId}
            onClose={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("publishedPostId");
              router.push(`/create-post?${params.toString()}`);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CreatePostContent />
    </Suspense>
  );
}
