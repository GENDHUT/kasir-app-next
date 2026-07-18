import Image from "next/image";
import Link from "next/link";
import { SignupForm } from "@/components/forms/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          className="flex items-center gap-2 self-center font-medium"
          href="/"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Image
              alt="Logo"
              height={250}
              priority
              src={"/logoPacarku.webp"}
              width={250}
            />
          </div>
          ALA-ALA
        </Link>
        <SignupForm />
      </div>
    </div>
  );
}
