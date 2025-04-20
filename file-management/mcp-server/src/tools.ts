import * as fs from "fs/promises";
import * as path from "path";

interface FileOperationResult {
  success: boolean;
  message: string;
  data?: any;
}

export const writeFile = async (
  filePath: string,
  content: string
): Promise<FileOperationResult> => {
  try {
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true }).catch(() => {});

    await fs.writeFile(filePath, content, "utf-8");

    return {
      success: true,
      message: `File successfully written to ${filePath}`,
    };
  } catch (err: any) {
    console.error(`Error writing file to ${filePath}:`, err.message);
    return {
      success: false,
      message: `Failed to write file: ${err.message}`,
    };
  }
};

export const readFile = async (
  filePath: string
): Promise<FileOperationResult> => {
  try {
    await fs.access(filePath);

    const content = await fs.readFile(filePath, "utf-8");

    return {
      success: true,
      message: `File successfully read from ${filePath}`,
      data: content,
    };
  } catch (err: any) {
    const message =
      err.code === "ENOENT"
        ? `File not found: ${filePath}`
        : `Failed to read file: ${err.message}`;

    console.error(message);
    return {
      success: false,
      message,
    };
  }
};

export const moveFile = async (
  oldPath: string,
  newPath: string
): Promise<FileOperationResult> => {
  try {
    try {
      await fs.access(oldPath);
    } catch (err) {
      return {
        success: false,
        message: `Source file does not exist: ${oldPath}`,
      };
    }

    const destDir = path.dirname(newPath);
    await fs.mkdir(destDir, { recursive: true }).catch(() => {});

    try {
      await fs.rename(oldPath, newPath);
    } catch (err: any) {
      if (err.code === "EXDEV") {
        const content = await fs.readFile(oldPath);
        await fs.writeFile(newPath, content);
        await fs.unlink(oldPath);
      } else {
        throw err;
      }
    }

    return {
      success: true,
      message: `File successfully moved from ${oldPath} to ${newPath}`,
    };
  } catch (err: any) {
    console.error(
      `Error moving file from ${oldPath} to ${newPath}:`,
      err.message
    );
    return {
      success: false,
      message: `Failed to move file: ${err.message}`,
    };
  }
};

export const listDirectory = async (
  dirPath: string
): Promise<FileOperationResult> => {
  try {
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        return {
          success: false,
          message: `Path is not a directory: ${dirPath}`,
        };
      }
    } catch (err) {
      return {
        success: false,
        message: `Directory does not exist: ${dirPath}`,
      };
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const formatted = entries
      .map(
        (entry) => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`
      )
      .join("\n");

    return {
      success: true,
      message: `Directory listed successfully: ${dirPath}`,
      data: formatted,
    };
  } catch (err: any) {
    console.error(`Error listing directory ${dirPath}:`, err.message);
    return {
      success: false,
      message: `Failed to list directory: ${err.message}`,
    };
  }
};

export const getFileInfo = async (
  filePath: string
): Promise<FileOperationResult> => {
  try {
    const stats = await fs.stat(filePath);

    const info = {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      permissions: stats.mode.toString(8).slice(-3),
    };

    const formatted = Object.entries(info)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");

    return {
      success: true,
      message: `File info retrieved for ${filePath}`,
      data: formatted,
    };
  } catch (err: any) {
    console.error(`Error getting file info for ${filePath}:`, err.message);
    return {
      success: false,
      message: `Failed to get file info: ${err.message}`,
    };
  }
};
