import Link from "next/link";
import { PhotoCard } from "@/components/cards/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getOrganizations } from "@/server/organizations";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import Image from "next/image";

export default async function Dashboard() {
  const organizations = await getOrganizations();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">
        Halo, {session?.user.name}
      </h1>
      <Image
        src="/Photo_Pacarku.webp"
        alt="photo"
        width={400}
        height={400}
      />

      <h1 className="text-3xl font-bold">
        Jihan Cantik
      </h1>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Mau Lihat Yang Imoet?</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Poto Lucu imoet bejir</DialogTitle>
            <DialogDescription>
              Inilah My PACAR GUWEEEH.
            </DialogDescription>
          </DialogHeader>
          <PhotoCard />
        </DialogContent>
      </Dialog>

      
    </div>
  );
}
