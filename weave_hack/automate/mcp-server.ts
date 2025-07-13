#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";

class StagehandMCPServer {
  private server: Server;
  private stagehand: Stagehand | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "stagehand-local",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupLifecycleHandlers();
  }

  private setupLifecycleHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "navigate",
            description: "Navigate to a URL",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "The URL to navigate to",
                },
              },
              required: ["url"],
            },
          },
          {
            name: "act",
            description: "Take an action on the page using natural language",
            inputSchema: {
              type: "object",
              properties: {
                instruction: {
                  type: "string",
                  description: "Natural language instruction for the action to take",
                },
              },
              required: ["instruction"],
            },
          },
          {
            name: "extract",
            description: "Extract structured data from the page",
            inputSchema: {
              type: "object",
              properties: {
                instruction: {
                  type: "string",
                  description: "What data to extract from the page",
                },
                schema: {
                  type: "object",
                  description: "JSON schema describing the expected data structure",
                },
              },
              required: ["instruction", "schema"],
            },
          },
          {
            name: "observe",
            description: "Observe elements on the page for planning actions",
            inputSchema: {
              type: "object",
              properties: {
                instruction: {
                  type: "string",
                  description: "What to observe on the page",
                },
              },
              required: ["instruction"],
            },
          },
          {
            name: "screenshot",
            description: "Take a screenshot of the current page",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "init_browser",
            description: "Initialize the browser session",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "close_browser",
            description: "Close the browser session",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "init_browser":
            return await this.initBrowser();
          
          case "navigate":
            if (!args || typeof args !== 'object' || !('url' in args) || typeof args.url !== 'string') {
              throw new Error('navigate requires a url parameter');
            }
            return await this.navigate(args.url);
          
          case "act":
            if (!args || typeof args !== 'object' || !('instruction' in args) || typeof args.instruction !== 'string') {
              throw new Error('act requires an instruction parameter');
            }
            return await this.act(args.instruction);
          
          case "extract":
            if (!args || typeof args !== 'object' || !('instruction' in args) || typeof args.instruction !== 'string' || !('schema' in args)) {
              throw new Error('extract requires instruction and schema parameters');
            }
            return await this.extract(args.instruction, args.schema);
          
          case "observe":
            if (!args || typeof args !== 'object' || !('instruction' in args) || typeof args.instruction !== 'string') {
              throw new Error('observe requires an instruction parameter');
            }
            return await this.observe(args.instruction);
          
          case "screenshot":
            return await this.screenshot();
          
          case "close_browser":
            return await this.closeBrowser();
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${errorMessage}`
        );
      }
    });
  }

  private setupToolHandlers() {
    // Tool handlers are set up in setupLifecycleHandlers
  }

  private async initBrowser() {
    if (this.stagehand) {
      await this.stagehand.close();
    }

    this.stagehand = new Stagehand({
      ...StagehandConfig,
      env: "LOCAL", // Force local Chrome usage
    });
    
    await this.stagehand.init();
    
    return {
      content: [
        {
          type: "text",
          text: "Browser initialized successfully using local Chrome",
        },
      ],
    };
  }

  private async navigate(url: string) {
    if (!this.stagehand) {
      throw new Error("Browser not initialized. Call init_browser first.");
    }

    await this.stagehand.page.goto(url);
    
    return {
      content: [
        {
          type: "text",
          text: `Navigated to: ${url}`,
        },
      ],
    };
  }

  private async act(instruction: string) {
    if (!this.stagehand) {
      throw new Error("Browser not initialized. Call init_browser first.");
    }

    await this.stagehand.page.act(instruction);
    
    return {
      content: [
        {
          type: "text",
          text: `Action completed: ${instruction}`,
        },
      ],
    };
  }

  private async extract(instruction: string, schema: any) {
    if (!this.stagehand) {
      throw new Error("Browser not initialized. Call init_browser first.");
    }

    const result = await this.stagehand.page.extract({
      instruction,
      schema,
    });
    
    return {
      content: [
        {
          type: "text",
          text: `Extracted data: ${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  private async observe(instruction: string) {
    if (!this.stagehand) {
      throw new Error("Browser not initialized. Call init_browser first.");
    }

    const result = await this.stagehand.page.observe(instruction);
    
    return {
      content: [
        {
          type: "text",
          text: `Observed: ${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  private async screenshot() {
    if (!this.stagehand) {
      throw new Error("Browser not initialized. Call init_browser first.");
    }

    const screenshot = await this.stagehand.page.screenshot({ 
      fullPage: true 
    });
    
    return {
      content: [
        {
          type: "image",
          data: screenshot,
          mimeType: "image/png",
        },
      ],
    };
  }

  private async closeBrowser() {
    if (this.stagehand) {
      await this.stagehand.close();
      this.stagehand = null;
    }
    
    return {
      content: [
        {
          type: "text",
          text: "Browser closed successfully",
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Stagehand MCP server running on stdio");
  }
}

const server = new StagehandMCPServer();
server.run().catch(console.error); 