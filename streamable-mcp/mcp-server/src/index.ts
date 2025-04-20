import express, { Request, Response } from "express";
import { McpServer } from "./mcp";
import { config } from "dotenv";
import { z } from "zod";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
config();

const app = express();
app.use(express.json());

const server = new McpServer(
  new Server(
    {
      name: "example-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  )
);

const MCP_ENDPOINT = "/mcp";
app.post(MCP_ENDPOINT, async (req: Request, res: Response) => {
  await server.handlePostRequest(req, res);
});

app.get(MCP_ENDPOINT, async (req: Request, res: Response) => {
  await server.handleGetRequest(req, res);
});

const port = process.env.MCP_PORT || 8001;
app.listen(port, () => {
  console.log("MCP Server is running live on: http://localhost:8001/mcp");
});
