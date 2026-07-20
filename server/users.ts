"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

/*
|--------------------------------------------------------------------------
| Current User
|--------------------------------------------------------------------------
*/

export const getCurrentUser = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!currentUser) {
    redirect("/login");
  }

  return currentUser;
};

/*
|--------------------------------------------------------------------------
| Sign In
|--------------------------------------------------------------------------
*/

export const signIn = async (
  username: string,
  password: string
) => {
  try {
    await auth.api.signInUsername({
      body: {
        username,
        password,
      },
    });

    return {
      success: true,
      message: "Login berhasil",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan",
    };
  }
};

/*
|--------------------------------------------------------------------------
| Sign Up
|--------------------------------------------------------------------------
*/

export const signUp = async (
  username: string,
  name: string,
  email: string,
  password: string
) => {
  try {
    await auth.api.signUpEmail({
      body: {
        username,
        name,
        email,
        password,
      },
    });

    return {
      success: true,
      message: "Akun berhasil dibuat",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan",
    };
  }
};

/*
|--------------------------------------------------------------------------
| Get All Users
|--------------------------------------------------------------------------
*/

export const getUsers = async () => {
  try {
    return await db.query.user.findMany({
      orderBy: (user, { asc }) => [asc(user.createdAt)],
    });
  } catch (error) {
    console.error(error);
    return [];
  }
};