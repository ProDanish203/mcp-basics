import { config } from "dotenv";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { CoreMessage, generateText, tool } from "ai";
import { createInterface } from "readline/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { z } from "zod";

config();

const mcpClient = new Client({
  name: "MCP Client",
  version: "1.0.0",
});

const connectToMCPServer = async () => {
  try {
    const transport = new SSEClientTransport(
      new URL("http://localhost:8001/sse")
    );

    await mcpClient.connect(transport);
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
  GET_WEATHER = "getWeather",
  CREATE_INSTAGRAM_POST = "createInstagramPost",
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
    // Tool to get the weather for a city
    getWeather: tool({
      description: "Get weather information for a city",
      parameters: z.object({
        city: z.string().describe("City name"),
      }),
      execute: async (args) => {
        const result = await callTool(TOOLS.GET_WEATHER, args);
        return result.content as object[];
      },
    }),

    postOnInstagram: tool({
      description: "Create a Post on Instagram",
      parameters: z.object({
        url: z.string().describe("Image URL"),
        caption: z
          .string()
          .describe("Caption for the image to be posted on Instagram"),
      }),
      execute: async (args) => {
        const result = await callTool(TOOLS.CREATE_INSTAGRAM_POST, args);
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
