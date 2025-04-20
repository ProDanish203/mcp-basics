import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { listDirectory, moveFile, readFile, writeFile } from "./tools";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "filesystem",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "writeFile",
  "Write File",
  {
    filePath: z.string().describe("Path for the file to be written"),
    content: z.string().describe("Content to be written to the file"),
  },
  async ({ filePath, content }) => {
    const response = await writeFile(filePath, content);
    if (response.success) {
      return {
        content: [
          {
            type: "text",
            text: response.message,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: response.message,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "readFile",
  "Read File",
  {
    filePath: z.string().describe("Path for the file to be read"),
  },
  async ({ filePath }) => {
    const response = await readFile(filePath);
    if (response.success) {
      return {
        content: [
          {
            type: "text",
            text: `Message: ${response.message} \nContent: ${response.data}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: response.message,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "listDirectory",
  "List Directory",
  {
    dirPath: z.string().describe("Path for the directory to be listed"),
  },
  async ({ dirPath }) => {
    const response = await listDirectory(dirPath);
    if (response.success) {
      return {
        content: [
          {
            type: "text",
            text: `Message: ${response.message} \nLIST: ${response.data}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: response.message,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "moveFile",
  "Move File",
  {
    oldPath: z.string().describe("Path for the directory to be listed"),
    newPath: z.string().describe("Path for the directory to be listed"),
  },
  async ({ oldPath, newPath }) => {
    const response = await moveFile(oldPath, newPath);
    if (response.success) {
      return {
        content: [
          {
            type: "text",
            text: `Message: ${response.message}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: response.message,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
