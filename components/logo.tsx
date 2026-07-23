import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import { getCurrentUser } from "@/server/users";

export async function Logo() {
    const user = await getCurrentUser();

    return (
        <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
                <Avatar size="lg">
                    <AvatarImage src="/Logo.webp" alt="Ala-Ala" />
                    <AvatarFallback>AA</AvatarFallback>
                </Avatar>

                <div className="flex flex-col">
                    <span className="text-base font-semibold leading-none">
                        Ala-Ala
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {user.name} Dashboard
                    </span>
                </div>
            </div>
        </div>
    );
}
