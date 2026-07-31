import Image from "next/image";

import { PhotoCard } from "@/components/cards/card";
import { AddMenuDialog } from "@/components/menu/add-menu-dialog";
import { MenuTable } from "@/components/menu/menu-table";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { requireRole } from "@/server/helper/permission";
import { getMenus } from "@/server/menu";

export default async function Dashboard() {
  const user = await requireRole("ADMIN");
  const menus = await getMenus();

  return (
    <div className="grid min-h-screen grid-cols-1 gap-8 p-8 lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border p-6">
        <h1 className="text-center text-3xl font-bold">
          Halo, {user.name}
          <br />
          Role anda = {user.role}
        </h1>

        <Image
          src="/Cantik.webp"
          alt="photo"
          width={400}
          height={400}
          className="rounded-xl"
        />

        <h2 className="text-2xl font-bold">
          Jihan Cantik
        </h2>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              Mau Lihat Yang Imoet?
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Poto Lucu imoet bejir
              </DialogTitle>

              <DialogDescription>
                Inilah My PACAR GUWEEEH.
              </DialogDescription>
            </DialogHeader>

            <PhotoCard />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Menu
          </h2>

          <AddMenuDialog />
        </div>

        <MenuTable menus={menus} />
      </div>
    </div>
  );
}