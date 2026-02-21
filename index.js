#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import ImageKit from "imagekit";
import fs from "fs";
import path from "path";

// --- ImageKit client (lazy init, fail-fast on missing credentials) ---

let client = null;

function getClient() {
  if (client) return client;

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error(
      "Missing credentials. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT."
    );
  }

  client = new ImageKit({ publicKey, privateKey, urlEndpoint });
  return client;
}

// --- Helpers ---

function trimSlash(folder) {
  if (!folder) return "/";
  return folder.endsWith("/") ? folder.slice(0, -1) : folder;
}

function formatResult(text) {
  return { content: [{ type: "text", text }] };
}

function formatError(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}

function formatFileInfo(file) {
  const size = file.size ? `${(file.size / 1024).toFixed(1)} KB` : "N/A";
  const dims =
    file.width && file.height ? `${file.width}x${file.height}` : "";
  const tags =
    file.tags && file.tags.length > 0 ? `\n   Tags: ${file.tags.join(", ")}` : "";
  return `${file.name} (${file.fileType || "file"}, ${size}${dims ? ", " + dims : ""})${tags}\n   ID: ${file.fileId}\n   URL: ${file.url}`;
}

async function uploadToImageKit(fileData, fileName, options = {}) {
  const ik = getClient();

  const uploadOptions = {
    file: fileData,
    fileName,
    folder: trimSlash(options.folder),
    useUniqueFileName: options.useUniqueFileName ?? true,
    isPrivateFile: options.isPrivateFile ?? false,
    overwriteFile: options.overwriteFile ?? false,
  };

  if (options.tags?.length) uploadOptions.tags = options.tags;
  if (options.customCoordinates) uploadOptions.customCoordinates = options.customCoordinates;
  if (options.customMetadata) uploadOptions.customMetadata = options.customMetadata;

  const result = await ik.upload(uploadOptions);

  return formatResult(
    `File uploaded successfully.\n\n` +
      `   Name: ${result.name}\n` +
      `   ID: ${result.fileId}\n` +
      `   URL: ${result.url}\n` +
      `   Size: ${(result.size / 1024).toFixed(1)} KB\n` +
      `   Path: ${result.filePath}\n` +
      `   Type: ${result.fileType}`
  );
}

// --- Upload option schemas (shared) ---

const uploadOptionsSchema = {
  folder: z.string().default("/").describe("Destination folder path"),
  useUniqueFileName: z.boolean().default(true).describe("Generate unique filename to avoid conflicts"),
  isPrivateFile: z.boolean().default(false).describe("Whether file should be private"),
  overwriteFile: z.boolean().default(false).describe("Whether to overwrite existing file with same name"),
  tags: z.array(z.string()).optional().describe("Tags to associate with the file"),
  customCoordinates: z.string().optional().describe("Custom focus coordinates for cropping (x,y,width,height)"),
  customMetadata: z.record(z.string(), z.any()).optional().describe("Custom metadata key-value pairs"),
};

// --- Server setup ---

const server = new McpServer({
  name: "imagekit-mcp-server",
  version: "1.0.0",
  description: "MCP server for ImageKit.io media management",
});

// --- Tools ---

server.tool(
  "list_files",
  "List and search files in ImageKit media library",
  {
    path: z.string().default("/").describe("Folder path to list files from"),
    searchQuery: z.string().optional().describe("Search query for file names (supports ImageKit search syntax)"),
    limit: z.number().min(1).max(1000).default(20).describe("Number of files to return"),
    skip: z.number().min(0).default(0).describe("Number of files to skip for pagination"),
    fileType: z.enum(["image", "non-image", "all"]).default("all").describe("Filter by file type"),
    sort: z.string().default("DESC_CREATED").describe("Sort order (ASC_CREATED, DESC_CREATED, ASC_NAME, DESC_NAME, ASC_SIZE, DESC_SIZE)"),
  },
  async ({ path: filePath, searchQuery, limit, skip, fileType, sort }) => {
    const ik = getClient();

    const params = {
      path: filePath,
      limit,
      skip,
      sort,
      includeFolder: true,
    };

    if (searchQuery) params.searchQuery = searchQuery;
    if (fileType !== "all") params.fileType = fileType;

    const result = await ik.listFiles(params);
    const count = result.length;

    if (count === 0) {
      return formatResult(`No files found in "${filePath}"${searchQuery ? ` matching "${searchQuery}"` : ""}.`);
    }

    const lines = result.map((f) => formatFileInfo(f));
    const header = searchQuery
      ? `Found ${count} file(s) matching "${searchQuery}" in "${filePath}":`
      : `Found ${count} file(s) in "${filePath}":`;

    return formatResult(`${header}\n\n${lines.join("\n\n")}`);
  }
);

server.tool(
  "list_folders",
  "List folders in ImageKit",
  {
    path: z.string().default("/").describe("Folder path to list (default is root)"),
  },
  async ({ path: folderPath }) => {
    const ik = getClient();

    const result = await ik.listFiles({
      path: folderPath,
      includeFolder: true,
      type: "folder",
    });

    const folders = result.filter((item) => item.type === "folder");

    if (folders.length === 0) {
      return formatResult(`No folders found in "${folderPath}".`);
    }

    const lines = folders.map(
      (f) => `${f.name}\n   ID: ${f.folderId}\n   Path: ${f.folderPath}`
    );

    return formatResult(`Found ${folders.length} folder(s) in "${folderPath}":\n\n${lines.join("\n\n")}`);
  }
);

server.tool(
  "get_file_details",
  "Get detailed information about a specific file",
  {
    fileId: z.string().describe("The unique ID of the file"),
  },
  async ({ fileId }) => {
    const ik = getClient();
    const f = await ik.getFileDetails(fileId);

    const dims = f.width && f.height ? `\n   Dimensions: ${f.width}x${f.height}` : "";
    const tags = f.tags?.length ? `\n   Tags: ${f.tags.join(", ")}` : "";

    return formatResult(
      `File details:\n\n` +
        `   Name: ${f.name}\n` +
        `   ID: ${f.fileId}\n` +
        `   Type: ${f.fileType}\n` +
        `   Size: ${(f.size / 1024).toFixed(1)} KB${dims}\n` +
        `   URL: ${f.url}\n` +
        `   Path: ${f.filePath}${tags}\n` +
        `   Created: ${f.createdAt}\n` +
        `   Updated: ${f.updatedAt}`
    );
  }
);

server.tool(
  "upload_file",
  "Upload a local file to ImageKit",
  {
    filePath: z.string().describe("Local path to the file to upload"),
    fileName: z.string().optional().describe("Name for the uploaded file (defaults to original filename)"),
    ...uploadOptionsSchema,
  },
  async ({ filePath, fileName, ...options }) => {
    if (!fs.existsSync(filePath)) {
      return formatError(`File not found: ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString("base64");
    const name = fileName || path.basename(filePath);

    return uploadToImageKit(base64, name, options);
  }
);

server.tool(
  "upload_file_from_url",
  "Upload a file to ImageKit from a URL",
  {
    url: z.string().url().describe("URL of the file to upload"),
    fileName: z.string().describe("Name for the uploaded file"),
    ...uploadOptionsSchema,
  },
  async ({ url, fileName, ...options }) => {
    return uploadToImageKit(url, fileName, options);
  }
);

server.tool(
  "upload_base64_file",
  "Upload a file to ImageKit from base64 encoded data",
  {
    base64Data: z.string().describe("Base64 encoded file content (with or without data URI prefix)"),
    fileName: z.string().describe("Name for the uploaded file"),
    ...uploadOptionsSchema,
  },
  async ({ base64Data, fileName, ...options }) => {
    // Strip data URI prefix if present
    const clean = base64Data.startsWith("data:")
      ? base64Data.split(",")[1]
      : base64Data;

    return uploadToImageKit(clean, fileName, options);
  }
);

server.tool(
  "delete_file",
  "Delete a file from ImageKit",
  {
    fileId: z.string().describe("The unique ID of the file to delete"),
  },
  async ({ fileId }) => {
    const ik = getClient();
    await ik.deleteFile(fileId);
    return formatResult(`File deleted successfully. ID: ${fileId}`);
  }
);

server.tool(
  "create_folder",
  "Create a new folder in ImageKit",
  {
    folderName: z.string().describe("Name of the folder to create"),
    parentFolderPath: z.string().default("/").describe("Parent folder path"),
  },
  async ({ folderName, parentFolderPath }) => {
    const ik = getClient();
    await ik.createFolder({ folderName, parentFolderPath });
    return formatResult(`Folder "${folderName}" created in "${parentFolderPath}".`);
  }
);

server.tool(
  "delete_folder",
  "Delete a folder from ImageKit",
  {
    folderPath: z.string().describe("Full path of the folder to delete"),
  },
  async ({ folderPath }) => {
    const ik = getClient();
    await ik.deleteFolder(folderPath);
    return formatResult(`Folder deleted: ${folderPath}`);
  }
);

server.tool(
  "move_file",
  "Move a file to a different folder in ImageKit",
  {
    sourceFilePath: z.string().describe("Current full path of the file (e.g., /folder/image.jpg)"),
    destinationPath: z.string().describe("Destination folder path (e.g., /new-folder/)"),
  },
  async ({ sourceFilePath, destinationPath }) => {
    const ik = getClient();
    await ik.moveFile({ sourceFilePath, destinationPath });
    return formatResult(`File moved from "${sourceFilePath}" to "${destinationPath}".`);
  }
);

server.tool(
  "generate_url",
  "Generate an ImageKit URL with transformations (resize, crop, format, quality, etc.)",
  {
    path: z.string().optional().describe("Image path relative to URL endpoint (e.g., /folder/image.jpg)"),
    src: z.string().optional().describe("Absolute image URL (alternative to path)"),
    transformation: z
      .array(z.record(z.string(), z.any()))
      .optional()
      .describe("Array of transformation objects (e.g., [{height: 300, width: 300}])"),
    transformationPosition: z.enum(["path", "query"]).default("path").describe("Where to place transformation params"),
    signed: z.boolean().default(false).describe("Generate a signed URL"),
    expireSeconds: z.number().default(300).describe("Signed URL expiry in seconds"),
  },
  async ({ path: imgPath, src, transformation, transformationPosition, signed, expireSeconds }) => {
    if (!imgPath && !src) {
      return formatError("Either 'path' or 'src' is required.");
    }

    const ik = getClient();

    const options = { transformation_position: transformationPosition };
    if (imgPath) options.path = imgPath;
    if (src) options.src = src;
    if (transformation) options.transformation = transformation;
    if (signed) {
      options.signed = true;
      options.expire_seconds = expireSeconds;
    }

    const url = ik.url(options);

    return formatResult(
      `Generated URL:\n\n   ${url}` +
        (signed ? `\n\n   Signed: yes, expires in ${expireSeconds}s` : "")
    );
  }
);

// --- Start ---

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("ImageKit MCP server running on stdio");
