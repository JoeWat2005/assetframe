import { authServerMetadataHandlerClerk, metadataCorsOptionsRequestHandler } from "@clerk/mcp-tools/next";

export const dynamic = "force-dynamic";

// RFC 8414 Authorization Server Metadata, proxied from the Clerk instance — lets MCP clients
// discover Clerk's OAuth endpoints (authorize, token, registration) for the Pro flow.
export const GET = authServerMetadataHandlerClerk();
export const OPTIONS = metadataCorsOptionsRequestHandler();
