import { config } from "dotenv";
import { MCPClient } from "./mcp.js";

config();

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
