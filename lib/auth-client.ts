import {
  lastLoginMethodClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "https://www.alal-ala.my.id",
  plugins: [organizationClient(), lastLoginMethodClient()],
});
