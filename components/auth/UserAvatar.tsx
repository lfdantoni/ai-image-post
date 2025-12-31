import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({
  name,
  image,
  size = "md",
  className,
}: UserAvatarProps) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={40}
        height={40}
        className={cn(
          "rounded-full object-cover",
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center",
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
