"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Slider } from "@/components/ui/Slider";
import { AspectRatioSelector } from "./AspectRatioSelector";
import { INSTAGRAM_ASPECTS, AspectRatioKey } from "@/lib/instagram-formats";
import { getCroppedImg } from "@/lib/crop-utils";
import { Button } from "@/components/ui/Button";

interface Point {
  x: number;
  y: number;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropData {
  aspect: AspectRatioKey;
  crop: Point;
  zoom: number;
  croppedAreaPixels: Area;
}

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: Blob, cropData: CropData) => void;
  onCancel: () => void;
  initialAspect?: AspectRatioKey;
}

export function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
  initialAspect = "portrait",
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation] = useState(0);
  const [aspect, setAspect] = useState<AspectRatioKey>(initialAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((location: Point) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropCompleteHandler = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );

      if (croppedImage) {
        onCropComplete(croppedImage, {
          aspect,
          crop,
          zoom,
          croppedAreaPixels,
        });
      }
    } catch (error) {
      console.error("Error al recortar imagen:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1 min-h-[300px] bg-gray-900">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={INSTAGRAM_ASPECTS[aspect].value}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={onZoomChange}
          showGrid={true}
          classes={{
            containerClassName: "rounded-lg",
            mediaClassName: "rounded-lg",
          }}
        />
      </div>

      <div className="p-4 space-y-4 bg-white border-t">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Formato
          </label>
          <AspectRatioSelector selected={aspect} onSelect={setAspect} />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">Zoom</label>
            <span className="text-sm text-gray-500">{zoom.toFixed(1)}x</span>
          </div>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={([value]) => setZoom(value)}
            className="w-full"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            isLoading={isProcessing}
            className="flex-1"
          >
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
}
