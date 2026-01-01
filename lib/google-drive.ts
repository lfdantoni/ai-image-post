import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { updateGoogleTokens } from "./auth";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  webViewLink: string;
}

export interface UploadParams {
  name: string;
  mimeType: string;
  content: Buffer;
  parentFolderId?: string;
  description?: string;
}

export interface StorageQuota {
  used: number;
  total: number;
  usedFormatted: string;
  totalFormatted: string;
}

const APP_FOLDER_NAME = process.env.GOOGLE_DRIVE_FOLDER_NAME || "AIImagePost";

/**
 * Check if Google Drive is enabled via environment variable
 * @returns true if Drive is enabled, false otherwise
 */
export function isDriveEnabled(): boolean {
  const enabled = process.env.GOOGLE_DRIVE_ENABLED;
  console.log(`[isDriveEnabled] GOOGLE_DRIVE_ENABLED env var: ${enabled} (${typeof enabled})`);
  // If explicitly set to "false" or "0", it's disabled.
  // Otherwise, if it's explicitly set to "true" or "1", it's enabled.
  // If not set at all, we default to TRUE for backward compatibility.
  if (enabled === "false" || enabled === "0") return false;
  if (enabled === "true" || enabled === "1") return true;
  return enabled === undefined || enabled === null || enabled === "";
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Google Drive Service for interacting with Drive API v3
 */
export class GoogleDriveService {
  private drive: drive_v3.Drive;
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private userId: string;
  private refreshToken: string | null;

  constructor(
    userId: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt?: number | null
  ) {
    this.userId = userId;
    this.refreshToken = refreshToken;

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiresAt ? expiresAt * 1000 : undefined,
    });

    // Set up automatic token refresh
    this.oauth2Client.on("tokens", async (tokens) => {
      if (tokens.access_token) {
        const expiresAt = tokens.expiry_date
          ? Math.floor(tokens.expiry_date / 1000)
          : Math.floor(Date.now() / 1000) + 3600;

        await updateGoogleTokens(this.userId, {
          accessToken: tokens.access_token,
          expiresAt,
        });
      }
    });

    this.drive = google.drive({ version: "v3", auth: this.oauth2Client });
  }

  /**
   * Ensure the root AIImagePost folder exists, create if not
   */
  async ensureRootFolder(): Promise<string> {
    // Search for existing folder
    const response = await this.drive.files.list({
      q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Create the folder
    const folder = await this.drive.files.create({
      requestBody: {
        name: APP_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });

    return folder.data.id!;
  }

  /**
   * Create a folder in Drive
   */
  async createFolder(name: string, parentId?: string): Promise<string> {
    const parents = parentId ? [parentId] : undefined;

    const folder = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents,
      },
      fields: "id",
    });

    return folder.data.id!;
  }

  /**
   * Ensure a subfolder exists within the root folder (or another parent)
   */
  async ensureSubfolder(name: string, parentId: string): Promise<string> {
    // Search for existing folder
    const response = await this.drive.files.list({
      q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Create the folder
    return this.createFolder(name, parentId);
  }

  /**
   * Upload a file to Drive
   */
  async uploadFile(params: UploadParams): Promise<DriveFile> {
    const { name, mimeType, content, parentFolderId, description } = params;

    const parents = parentFolderId ? [parentFolderId] : undefined;

    // Convert Buffer to ReadableStream
    const stream = Readable.from(content);

    const file = await this.drive.files.create({
      requestBody: {
        name,
        mimeType,
        description,
        parents,
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: "id, name, mimeType, size, createdTime, webViewLink",
    });

    return {
      id: file.data.id!,
      name: file.data.name!,
      mimeType: file.data.mimeType!,
      size: parseInt(file.data.size || "0"),
      createdTime: file.data.createdTime!,
      webViewLink: file.data.webViewLink!,
    };
  }

  /**
   * List files in a folder
   */
  async listFiles(folderId: string, pageSize = 100): Promise<DriveFile[]> {
    const response = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType, size, createdTime, webViewLink)",
      pageSize,
      orderBy: "createdTime desc",
    });

    return (response.data.files || []).map((f) => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      size: parseInt(f.size || "0"),
      createdTime: f.createdTime!,
      webViewLink: f.webViewLink || "",
    }));
  }

  /**
   * Delete a file by ID
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.drive.files.delete({ fileId });
  }

  /**
   * Get folder web link
   */
  async getFolderLink(folderId: string): Promise<string> {
    const response = await this.drive.files.get({
      fileId: folderId,
      fields: "webViewLink",
    });
    return response.data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`;
  }

  /**
   * Get storage quota for the user
   */
  async getStorageQuota(): Promise<StorageQuota> {
    const response = await this.drive.about.get({
      fields: "storageQuota",
    });

    const quota = response.data.storageQuota;
    const used = parseInt(quota?.usage || "0");
    const total = parseInt(quota?.limit || "0");

    return {
      used,
      total,
      usedFormatted: formatBytes(used),
      totalFormatted: total > 0 ? formatBytes(total) : "Unlimited",
    };
  }

  /**
   * Get organized folder path for exports (by month)
   */
  async getExportFolder(rootFolderId: string): Promise<string> {
    // Ensure Exports folder exists
    const exportsId = await this.ensureSubfolder("Exports", rootFolderId);

    // Get current month folder (e.g., "2025-01")
    const now = new Date();
    const monthFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    return this.ensureSubfolder(monthFolder, exportsId);
  }

  /**
   * Get backup folder for original images
   */
  async getBackupFolder(rootFolderId: string): Promise<string> {
    const backupsId = await this.ensureSubfolder("Backups", rootFolderId);
    return this.ensureSubfolder("originals", backupsId);
  }
}

/**
 * Create a GoogleDriveService instance from user tokens
 */
export function createDriveService(
  userId: string,
  tokens: {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  }
): GoogleDriveService | null {
  if (!tokens.accessToken) {
    return null;
  }

  return new GoogleDriveService(
    userId,
    tokens.accessToken,
    tokens.refreshToken,
    tokens.expiresAt
  );
}
