import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  InitializeRequestSchema,
  JSONRPCError,
  JSONRPCNotification,
  ListToolsRequestSchema,
  LoggingMessageNotification,
  ToolListChangedNotification,
} from "@modelcontextprotocol/sdk/types.js";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import z from "zod";

const SESSION_ID_HEADER_NAME = "mcp-session-id";
const JSON_RPC = "2.0";

export class McpServer {
  server: Server;
  transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  private toolInterval: NodeJS.Timeout | undefined;
  private getWeatherToolName = "get-weather";

  constructor(server: Server) {
    this.server = server;
    this.setupTools();
  }

  async handleGetRequest(req: Request, res: Response) {
    console.log("Handling GET request for session ID:");

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !this.transports[sessionId]) {
      res
        .status(400)
        .json(
          this.createErrorResponse("Bad Request: invalid session ID or method.")
        );
      return;
    }

    console.log(`Establishing SSE stream for session ${sessionId}`);
    const transport = this.transports[sessionId];
    await transport.handleRequest(req, res);
    await this.sendMessages(transport);

    return;
  }

  async handlePostRequest(req: Request, res: Response) {
    const sessionId = req.headers[SESSION_ID_HEADER_NAME] as string | undefined;

    console.log("Handling POST request for session ID:", sessionId);
    console.log("Body:", req.body);

    let transport: StreamableHTTPServerTransport;

    try {
      // reuse existing transport if sessionId is provided
      if (sessionId && this.transports[sessionId]) {
        transport = this.transports[sessionId];
        await transport.handleRequest(req, res, req.body);
        return;
      }

      //   create a new transport if sessionId is not provided
      if (!sessionId && this.isInitializeRequest(req.body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        await this.server.connect(transport);
        await transport.handleRequest(req, res, req.body);

        const sessionId = transport.sessionId;
        if (sessionId) {
          this.transports[sessionId] = transport;
          console.log("New session ID:", sessionId);
        }

        await this.sendMessages(transport);
        return;
      }

      res
        .status(400)
        .json(
          this.createErrorResponse("Bad Request: invalid session ID or method.")
        );
      return;
    } catch (err) {
      console.error("Error handling MCP request:", err);
      res.status(500).json(this.createErrorResponse("Internal server error."));
      return;
    }
  }

  private setupTools() {
    // Define available tools
    const setToolSchema = () =>
      this.server.setRequestHandler(ListToolsRequestSchema, async () => {
        const getWeatherTool = {
          name: this.getWeatherToolName,
          description: "Get weather information for a city",
          inputSchema: {
            type: "object",
            properties: {
              city: {
                type: "string",
                description: "City name",
              },
            },
            required: ["city"],
          },
        };

        return {
          tools: [getWeatherTool],
        };
      });

    setToolSchema();

    // set tools dynamically, changing 5 second
    this.toolInterval = setInterval(async () => {
      setToolSchema();
      // to notify client that the tool changed
      Object.values(this.transports).forEach((transport) => {
        const notification: ToolListChangedNotification = {
          method: "notifications/tools/list_changed",
        };
        this.sendNotification(transport, notification);
      });
    }, 5000);

    // handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request, extra) => {
        console.log("tool request received: ", request);
        console.log("extra: ", extra);

        const args = request.params.arguments;
        const toolName = request.params.name;
        const sendNotification = extra.sendNotification;

        if (!args) throw new Error("arguments undefined");
        if (!toolName) throw new Error("tool name undefined");

        if (toolName === this.getWeatherToolName) {
          const { city } = args;
          if (!city) throw new Error("City name undefined.");

          let notification: LoggingMessageNotification = {
            method: "notifications/message",
            params: { level: "info", data: `Getting the weather for: ${city}` },
          };

          await sendNotification(notification);

          return {
            content: [
              {
                type: "text",
                text: `The weather in ${city} is sunny with a temperature of 25°C.`,
              },
            ],
          };
        }

        throw new Error("Tool not found");
      }
    );
  }

  private async sendNotification(
    transport: StreamableHTTPServerTransport,
    notification: ToolListChangedNotification
  ) {
    const rpcNotificaiton: JSONRPCNotification = {
      ...notification,
      jsonrpc: JSON_RPC,
    };
    await transport.send(rpcNotificaiton);
  }

  // send message streaming message every second
  // cannot use server.sendLoggingMessage because we have can have multiple transports
  private async sendMessages(transport: StreamableHTTPServerTransport) {
    //... same as above
  }

  private createErrorResponse(message: string): JSONRPCError {
    return {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: message,
      },
      id: randomUUID(),
    };
  }

  private isInitializeRequest(body: any): boolean {
    const isInitial = (data: any) => {
      const result = InitializeRequestSchema.safeParse(data);
      return result.success;
    };
    if (Array.isArray(body)) {
      return body.some((request) => isInitial(request));
    }
    return isInitial(body);
  }

  async cleanup() {
    this.toolInterval?.close();
    await this.server.close();
  }
}
