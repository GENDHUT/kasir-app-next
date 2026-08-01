"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const formSchema = z
    .object({
        currentPassword: z
            .string()
            .min(8, "Password lama minimal 8 karakter"),

        newPassword: z
            .string()
            .min(8, "Password baru minimal 8 karakter"),

        confirmPassword: z
            .string()
            .min(8, "Konfirmasi password minimal 8 karakter"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Konfirmasi password tidak sama.",
    });

type FormValues = z.infer<typeof formSchema>;

export function ChangePasswordForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(values: FormValues) {
        setIsLoading(true);

        try {
            const { error } = await authClient.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
                revokeOtherSessions: true,
            });

            if (error) {
                toast.error(error.message);
                return;
            }

            toast.success("Password berhasil diubah.");

            form.reset();

            setTimeout(() => {
                router.replace("/");
            }, 1000);
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Terjadi kesalahan saat mengubah password."
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">
                        Ganti Password
                    </CardTitle>

                    <CardDescription>
                        Masukkan password lama kemudian buat password baru.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-6"
                        >
                            <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password Lama</FormLabel>

                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="password"
                                                autoComplete="current-password"
                                            />
                                        </FormControl>

                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password Baru</FormLabel>

                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="password"
                                                autoComplete="new-password"
                                            />
                                        </FormControl>

                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Konfirmasi Password Baru
                                        </FormLabel>

                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="password"
                                                autoComplete="new-password"
                                            />
                                        </FormControl>

                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    "Simpan Password Baru"
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
