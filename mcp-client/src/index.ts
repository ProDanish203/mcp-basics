import { config } from "dotenv";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { CoreMessage } from "ai";
import { createInterface } from "readline/promises";
import { MCPClient } from "./mcp.js";

config();

try {
  const getGemini = async () => {
    const gemini = await createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    return gemini;
  };

  const chatHistory: CoreMessage[] = [];
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  const chatLoop = async () => {
    const question = await rl.question("You: ");

    chatHistory.push({
      role: "user",
      content: question,
    });
  };
} catch (err) {
  console.error("Error:", err);
  process.exit(1);
}

async function main() {
  const client = new MCPClient("sse-server");

  try {
    await client.connectToServer("http://localhost:8001/mcp");
    await client.listTools();
    console.log("Listing all tools: ");
    for (const tool of client.tools) {
      console.log(`Tool: ${tool.name}, Description: ${tool.description}`);
      //   await client.callTool(tool.name);
    }
    console.log("Calling tool: getWeather");
    await client.callTool("get-weather");
    await client.waitForCompletion();
  } catch (err) {
    console.error("Error connecting to server:", err);
  } finally {
    await client.cleanup();
  }
}

main();
