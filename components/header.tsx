import { Logout } from "./logout";
import { ModeSwitcher } from "./mode-switcher";
import { SidebarTrigger } from "@/components/ui/sidebar";

export async function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Logout />
        <ModeSwitcher />
      </div>
    </header>
  );
}