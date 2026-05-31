import { lastLoginMethodClient, organizationClient } from "better-auth/client/plugins";

import { createAuthClient } from "better-auth/client";

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5555";

export const authClient = createAuthClient({
    baseURL: serverURL,
    plugins: [
        organizationClient(),
        lastLoginMethodClient()
    ]
});

export const { signIn, signUp, signOut, useSession, getSession, forgetPassword, resetPassword, deleteUser, changePassword, updateUser } = authClient;
