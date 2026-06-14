import { lastLoginMethodClient, organizationClient } from "better-auth/client/plugins";

import { createAuthClient } from "better-auth/client";

// Single-app: the API (including /api/auth/*) is served same-origin via Next.js
// Route Handlers, so no explicit baseURL is needed (defaults to current origin).
export const authClient = createAuthClient({
    plugins: [
        organizationClient(),
        lastLoginMethodClient()
    ]
});

export const { signIn, signUp, signOut, useSession, getSession, requestPasswordReset, resetPassword, deleteUser, changePassword, updateUser } = authClient;
