import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  LoggingMessageNotificationSchema,
  TextContentSchema,
  ToolListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";

export class MCPClient {
  tools: { name: string; description: string }[] = [];

  private client: Client;
  private transport: StreamableHTTPClientTransport | null = null;
  private isCompleted = false;

  constructor(serverName: string) {
    this.client = new Client({
      name: `mcp-client-for-${serverName}`,
      version: "1.0.0",
    });
  }

  async connectToServer(serverUrl: string) {
    const url = new URL(serverUrl);
    try {
      this.transport = new StreamableHTTPClientTransport(url);
      await this.client.connect(this.transport);
      console.log("Connected to server");

      this.setUpTransport();
      this.setUpNotifications();
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  private setUpTransport() {
    if (this.transport === null) {
      return;
    }
    this.transport.onclose = () => {
      console.log("SSE transport closed.");
      this.isCompleted = true;
    };

    this.transport.onerror = async (error) => {
      console.log("SSE transport error: ", error);
      await this.cleanup();
    };

    // this.transport.onmessage = (message) => {
    //   console.log("message received: ", message);
    // };
  }

  async listTools() {
    try {
      const toolResult = await this.client.listTools();
      console.log("Tools: ", toolResult.tools);
      this.tools = toolResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description ?? "",
        };
      });
    } catch (error) {
      console.error("Error listing tools: ", error);
    }
  }

  async callTool(toolName: string) {
    try {
      console.log("Calling tool: ", toolName);

      const result = await this.client.callTool({
        name: toolName,
        arguments: {
          city: "Karachi",
        },
      });

      const content = result.content as object[];

      console.log("Tool result: ", content);

      content.forEach((item) => {
        const parse = TextContentSchema.safeParse(item);
        if (parse.success) {
          console.log("Parsed content: ", parse.data.text);
        } else {
          console.error("Failed to parse content: ", parse.error.format());
        }
      });
    } catch (error) {
      console.error("Error calling tool: ", error);
    }
  }

  private setUpNotifications() {
    this.client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      (notification) => {
        console.log(
          "LoggingMessageNotificationSchema received:  ",
          notification
        );
      }
    );
    // will only be triggered after list tools called
    this.client.setNotificationHandler(
      ToolListChangedNotificationSchema,
      async (notification) => {
        console.log(
          "ToolListChangedNotificationSchema received:  ",
          notification
        );
        await this.listTools();
      }
    );
  }

  async waitForCompletion() {
    while (!this.isCompleted) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async cleanup() {
    await this.client.close();
  }
}
