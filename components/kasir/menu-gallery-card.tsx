"use client";

import Image from "next/image";

import {
    Badge,
} from "@/components/ui/badge";

interface MenuGalleryCardProps {
    menu: any;
    onClick: () => void;
}

export function MenuGalleryCard({
    menu,
    onClick,
}: MenuGalleryCardProps) {
    const isAvailable = Boolean(
        menu.available
    );

    return (
        <button
            type="button"
            onClick={onClick}
            className="group w-full text-left outline-none"
        >
            <div className="space-y-3">
                {/* IMAGE */}

                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-transparent">
                    {menu.imageUrl ? (
                        <Image
                            src={menu.imageUrl}
                            alt={menu.name}
                            fill
                            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                            No Image
                        </div>
                    )}

                    {/* STATUS */}

                    <div className="absolute right-2 top-2">
                        <Badge
                            variant={
                                isAvailable
                                    ? "default"
                                    : "secondary"
                            }
                            className="text-[10px] shadow-sm"
                        >
                            {isAvailable
                                ? "Tersedia"
                                : "Tidak tersedia"}
                        </Badge>
                    </div>
                </div>

                {/* MENU NAME */}

                <div className="text-center">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                        {
                            menu.name
                        }
                    </h3>
                </div>
            </div>
        </button>
    );
}