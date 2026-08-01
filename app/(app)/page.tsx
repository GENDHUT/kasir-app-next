import { CreateOrderButton } from "@/components/kasir/create-order-button";
import { MenuGallery } from "@/components/kasir/menu-gallery";
import { PendingOrderTable } from "@/components/kasir/pending-order-table";

import { requireRole } from "@/server/helper/permission";
import { getMenus } from "@/server/menu";
import { getPendingOrders } from "@/server/pesanan";

export default async function Home() {
  await requireRole("ADMIN", "EMPLOYEE");

  const [menus, pendingOrders] = await Promise.all([
    getMenus(),
    getPendingOrders(),
  ]);

  const formattedPendingOrders = pendingOrders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,

    user: {
      id: order.user.id,
      name: order.user.name,
      email: order.user.email,
    },

    items: order.items.map((item) => ({
      id: item.id,
      menuId: item.menuId,
      menuVariantId: item.menuVariantId,
      menuName: item.menuName,
      variantName: item.variantName,
      quantity: item.quantity,
      price: item.unitPrice,
    })),

    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.tax,
    total: order.total,
    notes: order.notes,
  }));

  return (
    <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Daftar Menu
          </h1>

          <p className="text-sm text-muted-foreground sm:text-base">
            Pilih menu untuk melihat informasi lengkap dan variant yang tersedia.
          </p>
        </div>

        <CreateOrderButton menus={menus} />
      </div>

      {/* Menu Gallery */}
      <MenuGallery menus={menus} />

      {/* Pending Orders */}
      <section className="mt-12 space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Pesanan Pending
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Kelola pesanan yang belum menyelesaikan pembayaran.
          </p>
        </div>

        <PendingOrderTable
          orders={formattedPendingOrders}
          menus={menus}
          qrisImageUrl="/qris.webp"
        />
      </section>
    </main>
  );
}