import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";
import { db } from "../db";
import { personPhotos, persons, trees } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ApiException } from "./errors";
import { authorizationService } from "./authorization";

// ------------------------------------------
// IMAGE PROCESSOR
// ------------------------------------------
export interface ProcessedImage {
  contentType: "image/jpeg" | "image/png";
  bytes: Buffer;
  width: number;
  height: number;
}

const MAX_BYTES = 5242880; // 5 MiB default

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (!input || input.length === 0) {
    throw ApiException.validation("file", "The uploaded file is empty.");
  }
  if (input.length > MAX_BYTES) {
    throw ApiException.validation(
      "file",
      `The image exceeds the maximum size of ${MAX_BYTES} bytes.`
    );
  }

  // Detect type by magic bytes
  let contentType: "image/jpeg" | "image/png" | null = null;
  if (input.length >= 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) {
    contentType = "image/jpeg";
  } else if (
    input.length >= 8 &&
    input[0] === 0x89 &&
    input[1] === 0x50 &&
    input[2] === 0x4e &&
    input[3] === 0x47 &&
    input[4] === 0x0d &&
    input[5] === 0x0a &&
    input[6] === 0x1a &&
    input[7] === 0x0a
  ) {
    contentType = "image/png";
  }

  if (!contentType) {
    throw ApiException.validation("file", "Unsupported image type; only JPEG and PNG are accepted.");
  }

  try {
    const sh = sharp(input);
    const metadata = await sh.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // re-encode to strip EXIF metadata
    let sanitized: Buffer;
    if (contentType === "image/jpeg") {
      // JPEG - drop alpha channel if exists to convert to RGB safely
      sanitized = await sh.flatten().jpeg({ quality: 80 }).toBuffer();
    } else {
      sanitized = await sh.png().toBuffer();
    }

    return {
      contentType,
      bytes: sanitized,
      width,
      height,
    };
  } catch (err: any) {
    throw ApiException.validation("file", `The file is not a valid image: ${err.message}`);
  }
}

// ------------------------------------------
// STORAGE SERVICES
// ------------------------------------------
export interface StorageService {
  put(key: string, content: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export class FilesystemStorageService implements StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(os.tmpdir(), "caygiapha-photos");
  }

  private resolveKey(key: string): string {
    if (!key || key.trim() === "") {
      throw ApiException.validation("objectKey", "A storage key is required.");
    }
    const resolved = path.normalize(path.join(this.baseDir, key));
    if (!resolved.startsWith(this.baseDir)) {
      throw ApiException.validation("objectKey", "Invalid storage key.");
    }
    return resolved;
  }

  async put(key: string, content: Buffer, contentType: string): Promise<void> {
    const target = this.resolveKey(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }

  async get(key: string): Promise<Buffer> {
    const target = this.resolveKey(key);
    try {
      return await fs.readFile(target);
    } catch {
      throw ApiException.nodeNotAccessible("The requested image is not available.");
    }
  }

  async delete(key: string): Promise<void> {
    const target = this.resolveKey(key);
    try {
      await fs.unlink(target);
    } catch {}
  }
}

export class CloudinaryStorageService implements StorageService {
  constructor() {
    const cloudinaryUrl = process.env.CLOUDINARY_URL;
    if (cloudinaryUrl) {
      cloudinary.config({
        cloudinary_api_url: cloudinaryUrl,
      });
    } else {
      throw new Error("CLOUDINARY_URL is missing in environment variables.");
    }
  }

  async put(key: string, content: Buffer, contentType: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: key,
          overwrite: true,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
          } else {
            resolve();
          }
        }
      );
      uploadStream.end(content);
    });
  }

  async get(key: string): Promise<Buffer> {
    try {
      const url = cloudinary.url(key, { secure: true });
      const res = await fetch(url);
      if (!res.ok) {
        throw ApiException.nodeNotAccessible("The requested image is not available.");
      }
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      throw ApiException.nodeNotAccessible("The requested image could not be retrieved.");
    }
  }

  async delete(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(key, {}, (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary delete failed: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }
}

// Select active storage service
const storageType = process.env.APP_STORAGE_TYPE || "filesystem";
export const storageService: StorageService =
  storageType === "cloudinary" ? new CloudinaryStorageService() : new FilesystemStorageService();

// ------------------------------------------
// PHOTO SERVICE
// ------------------------------------------
export class PhotoService {
  async upload(
    currentUserId: string,
    ownedTreeId: string | null,
    treeId: string,
    personId: string,
    bytes: Buffer
  ): Promise<typeof personPhotos.$inferSelect> {
    await authorizationService.requireMutationPermitted(currentUserId, ownedTreeId, treeId, personId);
    const person = await this.requirePerson(treeId, personId);

    const image = await processImage(bytes);
    const objectKey = `persons/${personId}/${crypto.randomUUID()}`;

    // Upload to storage
    await storageService.put(objectKey, image.bytes, image.contentType);

    // Check if this is the first photo (becomes primary automatically)
    const existingPhotos = await db
      .select()
      .from(personPhotos)
      .where(eq(personPhotos.personId, personId));

    const isPrimary = existingPhotos.length === 0;

    const [photo] = await db
      .insert(personPhotos)
      .values({
        personId,
        objectKey,
        contentType: image.contentType,
        byteSize: image.bytes.length,
        width: image.width,
        height: image.height,
        isPrimary,
      })
      .returning();

    return photo;
  }

  async setPrimary(
    currentUserId: string,
    ownedTreeId: string | null,
    treeId: string,
    personId: string,
    photoId: string
  ): Promise<typeof personPhotos.$inferSelect> {
    await authorizationService.requireMutationPermitted(currentUserId, ownedTreeId, treeId, personId);
    await this.requirePerson(treeId, personId);

    const target = await db
      .select()
      .from(personPhotos)
      .where(and(eq(personPhotos.id, photoId), eq(personPhotos.personId, personId)))
      .then((rows) => rows[0]);

    if (!target) {
      throw ApiException.nodeNotAccessible("The photo is not accessible.");
    }

    // Clear current primary
    await db
      .update(personPhotos)
      .set({ isPrimary: false })
      .where(and(eq(personPhotos.personId, personId), eq(personPhotos.isPrimary, true)));

    // Set new primary
    const [updated] = await db
      .update(personPhotos)
      .set({ isPrimary: true })
      .where(eq(personPhotos.id, photoId))
      .returning();

    return updated;
  }

  async list(
    currentUserId: string,
    ownedTreeId: string | null,
    treeId: string,
    personId: string,
    shareToken?: string | null
  ): Promise<(typeof personPhotos.$inferSelect)[]> {
    await authorizationService.requireReadAccess(currentUserId, ownedTreeId, treeId, shareToken);
    await this.requirePerson(treeId, personId);

    return db
      .select()
      .from(personPhotos)
      .where(eq(personPhotos.personId, personId))
      .orderBy(desc(personPhotos.createdAt));
  }

  async serve(
    currentUserId: string,
    ownedTreeId: string | null,
    treeId: string,
    personId: string,
    photoId: string,
    shareToken?: string | null
  ): Promise<{ contentType: string; bytes: Buffer }> {
    await authorizationService.requireReadAccess(currentUserId, ownedTreeId, treeId, shareToken);
    const person = await this.requirePerson(treeId, personId);

    const photo = await db
      .select()
      .from(personPhotos)
      .where(and(eq(personPhotos.id, photoId), eq(personPhotos.personId, personId)))
      .then((rows) => rows[0]);

    if (!photo) {
      throw ApiException.nodeNotAccessible("The photo is not accessible.");
    }

    const isVisible = await this.photoVisible(currentUserId, ownedTreeId, treeId, person);
    if (!isVisible) {
      throw ApiException.notAuthorized("You are not authorized to view this photo.");
    }

    const bytes = await storageService.get(photo.objectKey);
    return { contentType: photo.contentType, bytes };
  }

  async delete(
    currentUserId: string,
    ownedTreeId: string | null,
    treeId: string,
    personId: string,
    photoId: string
  ): Promise<void> {
    await authorizationService.requireMutationPermitted(currentUserId, ownedTreeId, treeId, personId);
    await this.requirePerson(treeId, personId);

    const photo = await db
      .select()
      .from(personPhotos)
      .where(and(eq(personPhotos.id, photoId), eq(personPhotos.personId, personId)))
      .then((rows) => rows[0]);

    if (!photo) {
      throw ApiException.nodeNotAccessible("The photo is not accessible.");
    }

    // Delete from storage
    await storageService.delete(photo.objectKey);

    // Delete from DB
    await db.delete(personPhotos).where(eq(personPhotos.id, photoId));
  }

  async deleteAllForPerson(personId: string): Promise<void> {
    const photos = await db
      .select()
      .from(personPhotos)
      .where(eq(personPhotos.personId, personId));

    for (const photo of photos) {
      await storageService.delete(photo.objectKey);
    }

    await db.delete(personPhotos).where(eq(personPhotos.personId, personId));
  }

  private async photoVisible(
    currentUserId: string,
    ownedTreeId: string | null,
    treeId: string,
    person: typeof persons.$inferSelect
  ): Promise<boolean> {
    const role = await authorizationService.classify(currentUserId, ownedTreeId, treeId, person.id);
    if (role !== "NEITHER") {
      return true;
    }
    if (person.visPhoto !== "public") {
      return false;
    }

    const tree = await db
      .select()
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);

    const isLivingRedaction = tree ? tree.livingRedaction : true;
    const isLiving = this.isLiving(person);

    return !(isLivingRedaction && isLiving);
  }

  private isLiving(person: typeof persons.$inferSelect): boolean {
    if (person.deathStatus) {
      return false;
    }
    if (person.birthYear === null) {
      return true; // protect by default
    }
    const currentYear = new Date().getUTCFullYear();
    return person.birthYear > currentYear - 100;
  }

  private async requirePerson(treeId: string, personId: string) {
    const person = await db
      .select()
      .from(persons)
      .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)))
      .then((rows) => rows[0]);

    if (!person) {
      throw ApiException.nodeNotAccessible("The target node is not accessible.");
    }
    return person;
  }
}

export const photoService = new PhotoService();
