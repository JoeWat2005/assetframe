import { protectedResourceHandlerClerk, metadataCorsOptionsRequestHandler } from "@clerk/mcp-tools/next";

export const dynamic = "force-dynamic";

// RFC 9728 Protected Resource Metadata — tells MCP clients which OAuth Authorization Server
// (Clerk) protects the /api/mcp resource, so they can run the OAuth flow for Pro tools.
const handler = protectedResourceHandlerClerk();
export { handler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
