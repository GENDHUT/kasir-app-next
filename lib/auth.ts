import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { lastLoginMethod, username } from "better-auth/plugins";
import { Resend } from "resend";

import OrganizationInvitationEmail from "@/components/emails/organization-invitation";
import ForgotPasswordEmail from "@/components/emails/reset-password";
import VerifyEmail from "@/components/emails/verify-email";

import { db } from "@/db/drizzle";
import { schema } from "@/db/schema";



// const resend = new Resend(process.env.RESEND_API_KEY as string);
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const auth = betterAuth({
  /*
  |--------------------------------------------------------------------------
  | Email Verification
  |--------------------------------------------------------------------------
  */

  // emailVerification: {
  //   sendVerificationEmail: async ({ user, url }) => {
  //     await resend!.emails.send({
  //       from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
  //       to: user.email,
  //       subject: "Verify your email",
  //       react: VerifyEmail({
  //         username: user.name,
  //         verifyUrl: url,
  //       }),
  //     });
  //   },
  //   sendOnSignUp: true,
  // },

  /*
  |--------------------------------------------------------------------------
  | Google Login
  |--------------------------------------------------------------------------
  */

  socialProviders:
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET
      ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
      : {},

  /*
  |--------------------------------------------------------------------------
  | Email & Password
  |--------------------------------------------------------------------------
  */

  emailAndPassword: {
    enabled: true,

    // sendResetPassword: async ({ user, url }) => {
    //   await resend!.emails.send({
    //     from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
    //     to: user.email,
    //     subject: "Reset Password",
    //     react: ForgotPasswordEmail({
    //       username: user.name,
    //       resetUrl: url,
    //       userEmail: user.email,
    //     }),
    //   });
    // },

    requireEmailVerification: false,
  },

  /*
  |--------------------------------------------------------------------------
  | Database
  |--------------------------------------------------------------------------
  */

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  

/*
|--------------------------------------------------------------------------
| Plugins
|--------------------------------------------------------------------------
*/

plugins: [
  username(),
  lastLoginMethod(),
  nextCookies(),
],
});

