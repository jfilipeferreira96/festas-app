export const openApiInfo = {
  title: "Gestão de Festas Infantis API",
  version: "1.0.0",
  description: "API para gestão de festas infantis — reservas, festas, cacifos, menus e muito mais.",
};

export const servers = [
  {
    url: "http://localhost:5555",
    description: "Development server",
  },
];

export const securitySchemes = {
  cookieAuth: {
    type: "apiKey",
    in: "cookie",
    name: "better-auth.session_token",
  },
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  },
};

export const tags = [
  { name: "Auth", description: "Authentication endpoints" },
  // Tags will be added here as we implement new modules
];
