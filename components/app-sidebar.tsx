import * as React from "react";
import { ChevronRight } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { Logo } from "./logo";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getCurrentUser } from "@/server/users";

/*
|--------------------------------------------------------------------------
| SIDEBAR DATA
|--------------------------------------------------------------------------
*/

const data = {
  navMain: [
    {
      title: "Admin",
      url: "/dashboard",
      items: [
        {
          title: "Sign-up",
          url: "/signup",
        },
        {
          title: "Dashboard",
          url: "/admin",
        },
        {
          title: "Admin",
          url: "/dashboard",
        },
      ],
    },
    {
      title: "Kasir",
      url: "#",
      items: [
        {
          title: "Transaksi",
          url: "/",
        },
        {
          title: "Reset-password",
          url: "/reset-password",
          isActive: true,
        },
        // {
        //   title: "History Pelayanan",
        //   url: "#",
        // },
      ],
    },
  ],
};

/*
|--------------------------------------------------------------------------
| PROPS
|--------------------------------------------------------------------------
*/

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> { }

/*
|--------------------------------------------------------------------------
| APP SIDEBAR
|--------------------------------------------------------------------------
*/

export async function AppSidebar({ ...props }: AppSidebarProps) {
  /*
  |--------------------------------------------------------------------------
  | CURRENT USER
  |--------------------------------------------------------------------------
  */

  const user = await getCurrentUser();

  /*
  |--------------------------------------------------------------------------
  | FILTER SIDEBAR MENU
  |--------------------------------------------------------------------------
  */

  const visibleNavMain = data.navMain.filter((item) => {
    if (item.title === "Admin" && user.role !== "ADMIN") {
      return false;
    }

    return true;
  });

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <Sidebar {...props}>
      {/* SIDEBAR HEADER */}

      <SidebarHeader>
        <Logo />
        <SearchForm />
      </SidebarHeader>

      {/* SIDEBAR CONTENT */}

      <SidebarContent className="gap-0">
        {visibleNavMain.map((item) => (
          <Collapsible
            key={item.title}
            title={item.title}
            defaultOpen
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel
                asChild
                className="group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <CollapsibleTrigger>
                  {item.title}

                  <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {item.items.map((subItem) => (
                      <SidebarMenuItem key={subItem.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={subItem.isActive}
                        >
                          <a href={subItem.url}>
                            {subItem.title}
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      {/* SIDEBAR FOOTER */}

      <SidebarFooter />

      {/* SIDEBAR RAIL */}

      <SidebarRail />
    </Sidebar>
  );
}