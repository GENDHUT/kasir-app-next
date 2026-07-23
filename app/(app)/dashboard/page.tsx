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
import Image from "next/image";
import { requireRole } from "@/server/permission";
import DashboardComponent from "@/components/dashboard/page";
import data from "@/components/dashboard/data.json";



export default async function Dashboard() {
  const user = await requireRole("ADMIN");

  return (
    <>
      <div className="flex h-screen flex-col items-center justify-center gap-2">
        <h1 className="text-3xl font-bold">
          Halo, {user.name} Role anda = {user.role}
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

    </>
  );
}
