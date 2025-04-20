import { config } from "dotenv";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { CoreMessage, generateText, tool } from "ai";
import { createInterface } from "readline/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { z } from "zod";

config();

const mcpClient = new Client({
  name: "MCP Client - File Management",
  version: "1.0.0",
});

const connectToMCPServer = async () => {
  try {
    const transport = new SSEClientTransport(
      new URL("http://localhost:8001/sse")
    );

    await mcpClient.connect(transport);
    await listTools();
  } catch (err) {
    console.error("Error connecting to MCP server:", err);
  }
};

const listTools = async () => {
  const tools = (await mcpClient.listTools()).tools;
  tools.forEach((tool) => {
    console.log(`- ${tool.name}: ${tool.description}`);
  });
};

enum TOOLS {
  WRITE_FILE = "writeFile",
  READ_FILE = "readFile",
  LIST_DIRECTORY = "listDirectory",
  MOVE_FILE = "moveFile",
}

const callTool = async (toolName: TOOLS, args: any) => {
  const result = await mcpClient.callTool({
    name: toolName,
    arguments: args,
  });

  return result;
};

const getGemini = async () => {
  const gemini = await createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  return gemini;
};

const describeTools = () => {
  const tools = {
    writeFile: tool({
      description: "Write a file",
      parameters: z.object({
        filePath: z.string().describe("Path for the file to be written"),
        content: z.string().describe("Content to be written to the file"),
      }),
      execute: async (args) => {
        const result = await callTool(TOOLS.WRITE_FILE, args);
        return result.content as object[];
      },
    }),

    readFile: tool({
      description: "Read a file",
      parameters: z.object({
        filePath: z.string().describe("Path for the file to be read"),
      }),
      execute: async (args) => {
        const result = await callTool(TOOLS.READ_FILE, args);
        return result.content as object[];
      },
    }),

    listDirectory: tool({
      description: "List a directory",
      parameters: z.object({
        dirPath: z.string().describe("Path for the directory to be listed"),
      }),
      execute: async (args) => {
        const result = await callTool(TOOLS.LIST_DIRECTORY, args);
        return result.content as object[];
      },
    }),

    moveFile: tool({
      description: "Move a file",
      parameters: z.object({
        oldPath: z.string().describe("Path for the file to be moved"),
        newPath: z.string().describe("New path for the file"),
      }),
      execute: async (args) => {
        const result = await callTool(TOOLS.MOVE_FILE, args);
        return result.content as object[];
      },
    }),
  };

  return tools;
};

const chatHistory: CoreMessage[] = [];

async function main() {
  try {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "> ",
    });
    const chatLoop = async () => {
      const question = await rl.question("You: ");
      const ai = await getGemini();
      chatHistory.push({
        role: "user",
        content: question,
      });

      const { text } = await generateText({
        model: ai("gemini-2.0-flash-001"),
        messages: chatHistory,
        tools: describeTools(),
        maxSteps: 2,
      });

      console.log("AI:", text);
      chatHistory.push({
        role: "assistant",
        content: text,
      });

      chatLoop();
    };

    chatLoop();
  } catch (err) {
    console.error("Error connecting to server:", err);
  } finally {
  }
}

connectToMCPServer().then(() => main());
