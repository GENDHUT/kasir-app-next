import { Logout } from "./logout";
import { ModeSwitcher } from "./mode-switcher";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export async function Header() {

  return (
    <header className="absolute top-0 right-0 flex w-full items-center justify-between p-4">
      <div className="flex items-center gap-2">
        <Logout />
        <ModeSwitcher />
        <SidebarTrigger />

      </div>
    </header>
  );
}
