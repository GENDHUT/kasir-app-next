import Image from "next/image";

export function PhotoCard() {
    return (
        <div className="flex flex-col items-center gap-4 rounded-xl border p-5">

            <Image
                src="/PACARKUH.webp"
                alt="photo"
                width={350}
                height={350}
                className="rounded-lg object-cover"
            />

            <div className="text-center">
                <h3 className="text-xl font-bold">
                    Jihan Imoet
                </h3>

                <p className="text-muted-foreground">
                    Foto paling lucu menurut saya 😄
                </p>
            </div>

        </div>
    );
}