import Image from "next/image";
import Link from "next/link";
import { ModeSwitcher } from "@/components/mode-switcher";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/server/permission";


export default async function Home() {
  const user = await requireRole("ADMIN" , "EMPLOYEE");

  return (
    <>
      <header className="absolute top-0 right-0 flex items-center justify-end p-4">
      </header>
      <div className="flex h-screen flex-col items-center justify-center gap-5 px-5 text-center">
        <Image
          alt="LOGO"
          className="rounded-lg dark:invert"
          height={200}
          src="/logoPacarku.webp"
          width={200}
        />

        <h1 className="font-bold text-4xl">Kasir APP</h1>

        <h1 className="text-3xl font-bold">
          Halo, {user.name} Role anda = {user.role}
        </h1>

        <div className="flex gap-2">
          <Link href="/login">
            <Button>Login</Button>
          </Link>
          <Link href="/signup">
            <Button>Signup</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
