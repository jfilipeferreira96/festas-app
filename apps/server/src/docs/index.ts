import { openApiInfo, servers, securitySchemes, tags } from "./openapi";

export const apiSpec = {
  openapi: "3.0.3",
  info: openApiInfo,
  servers,
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  paths: {
    // API paths will be added here as we implement new modules
  },
  components: {
    securitySchemes,
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string", description: "Error message (i18n key)" },
        },
      },
      Message: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string", description: "Success message" },
        },
      },
    },
  },
  tags,
};
