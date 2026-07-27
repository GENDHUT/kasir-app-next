"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { deleteMenu } from "@/server/menu";

import { EditMenuDialog } from "./edit-menu-dialog";

interface MenuTableProps {
    menus: any[];
}

export function MenuTable({ menus }: MenuTableProps) {
    const router = useRouter();

    const [selectedMenu, setSelectedMenu] = useState<any | null>(null);
    const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | DELETE CLICK
    |--------------------------------------------------------------------------
    */

    function handleDeleteClick(menu: any) {
        setSelectedMenu(menu);
    }

    /*
    |--------------------------------------------------------------------------
    | EDIT CLICK
    |--------------------------------------------------------------------------
    */

    function handleEditClick(menu: any) {
        setEditingMenuId(menu.id);
    }

    /*
    |--------------------------------------------------------------------------
    | CONFIRM DELETE
    |--------------------------------------------------------------------------
    */

    async function handleConfirmDelete() {
        if (!selectedMenu) {
            return;
        }

        try {
            setDeleting(true);

            const result = await deleteMenu(selectedMenu.id);

            if (!result.success) {
                alert(result.message ?? "Gagal menghapus menu.");
                return;
            }

            setSelectedMenu(null);
            router.refresh();
        } catch (error) {
            console.error("Delete menu error:", error);

            alert(
                error instanceof Error
                    ? error.message
                    : "Terjadi kesalahan saat menghapus menu."
            );
        } finally {
            setDeleting(false);
        }
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-16">No</TableHead>
                        <TableHead>Gambar</TableHead>
                        <TableHead>Nama Menu</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {menus.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={6}
                                className="h-24 text-center text-muted-foreground"
                            >
                                Belum ada menu.
                            </TableCell>
                        </TableRow>
                    ) : (
                        menus.map((menu, index) => (
                            <TableRow key={menu.id}>
                                <TableCell>{index + 1}</TableCell>

                                <TableCell>
                                    {menu.imageUrl ? (
                                        <Image
                                            src={menu.imageUrl}
                                            alt={menu.name}
                                            width={60}
                                            height={60}
                                            className="h-15 w-15 rounded-md object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-15 w-15 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                                            No Image
                                        </div>
                                    )}
                                </TableCell>

                                <TableCell className="font-medium">
                                    <div className="space-y-1">
                                        <p>{menu.name}</p>

                                        {!menu.available && (
                                            <span className="text-xs text-muted-foreground">
                                                Tidak tersedia
                                            </span>
                                        )}
                                    </div>
                                </TableCell>

                                <TableCell className="max-w-xs">
                                    <p className="truncate">
                                        {menu.description || "-"}
                                    </p>
                                </TableCell>

                                <TableCell>
                                    <div className="space-y-1">
                                        {menu.menuVariants?.length > 0 ? (
                                            menu.menuVariants.map(
                                                (menuVariant: any) => (
                                                    <div
                                                        key={menuVariant.id}
                                                        className="flex gap-2 text-sm"
                                                    >
                                                        <span className="font-medium">
                                                            {
                                                                menuVariant
                                                                    .variant?.name
                                                            }
                                                        </span>

                                                        <span className="text-muted-foreground">
                                                            Rp{" "}
                                                            {Number(
                                                                menuVariant.price
                                                            ).toLocaleString(
                                                                "id-ID"
                                                            )}
                                                        </span>
                                                    </div>
                                                )
                                            )
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                -
                                            </span>
                                        )}
                                    </div>
                                </TableCell>

                                <TableCell>
                                    <div className="flex justify-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                handleEditClick(menu)
                                            }
                                        >
                                            Edit
                                        </Button>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            disabled={deleting}
                                            onClick={() =>
                                                handleDeleteClick(menu)
                                            }
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Hapus
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* EDIT MENU */}

            {editingMenuId && (
                <EditMenuDialog
                    menuId={editingMenuId}
                    open={Boolean(editingMenuId)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditingMenuId(null);
                            router.refresh();
                        }
                    }}
                />
            )}

            {/* DELETE CONFIRMATION */}

            <AlertDialog
                open={Boolean(selectedMenu)}
                onOpenChange={(open) => {
                    if (!open && !deleting) {
                        setSelectedMenu(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Yakin mau hapus menu ini?
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            Menu{" "}
                            <span className="font-semibold text-foreground">
                                "{selectedMenu?.name}"
                            </span>{" "}
                            beserta semua variant yang terhubung akan dihapus.
                            Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>
                            Tidak
                        </AlertDialogCancel>

                        <AlertDialogAction
                            disabled={deleting}
                            onClick={(event) => {
                                event.preventDefault();
                                handleConfirmDelete();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? "Menghapus..." : "Ya, Hapus"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}