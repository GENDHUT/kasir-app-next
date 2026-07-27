import { relations } from "drizzle-orm";

import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";


/*
|--------------------------------------------------------------------------
| ROLE
|--------------------------------------------------------------------------
*/

export const roleEnum = pgEnum("role", [
  "ADMIN",
  "EMPLOYEE",
]);

export type Role =
  (typeof roleEnum.enumValues)[number];


/*
|--------------------------------------------------------------------------
| USER
|--------------------------------------------------------------------------
*/

export const user = pgTable("user", {
  id: text("id").primaryKey(),

  username: text("username").notNull(),

  displayUsername: text("display_username"),

  name: text("name").notNull(),

  email: text("email").notNull().unique(),

  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),

  image: text("image"),

  role: roleEnum("role")
    .default("EMPLOYEE")
    .notNull(),

  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),

  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export type User =
  typeof user.$inferSelect;

export type NewUser =
  typeof user.$inferInsert;


/*
|--------------------------------------------------------------------------
| SESSION
|--------------------------------------------------------------------------
*/

export const session = pgTable("session", {
  id: text("id").primaryKey(),

  expiresAt: timestamp("expires_at")
    .notNull(),

  token: text("token")
    .notNull()
    .unique(),

  createdAt: timestamp("created_at")
    .notNull(),

  updatedAt: timestamp("updated_at")
    .notNull(),

  ipAddress: text("ip_address"),

  userAgent: text("user_agent"),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
    }),
});

export type Session =
  typeof session.$inferSelect;


/*
|--------------------------------------------------------------------------
| ACCOUNT
|--------------------------------------------------------------------------
*/

export const account = pgTable("account", {
  id: text("id").primaryKey(),

  accountId: text("account_id")
    .notNull(),

  providerId: text("provider_id")
    .notNull(),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
    }),

  accessToken: text("access_token"),

  refreshToken: text("refresh_token"),

  idToken: text("id_token"),

  accessTokenExpiresAt: timestamp(
    "access_token_expires_at"
  ),

  refreshTokenExpiresAt: timestamp(
    "refresh_token_expires_at"
  ),

  scope: text("scope"),

  password: text("password"),

  createdAt: timestamp("created_at")
    .notNull(),

  updatedAt: timestamp("updated_at")
    .notNull(),
});

export type Account =
  typeof account.$inferSelect;


/*
|--------------------------------------------------------------------------
| VERIFICATION
|--------------------------------------------------------------------------
*/

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),

    identifier: text("identifier")
      .notNull(),

    value: text("value")
      .notNull(),

    expiresAt: timestamp("expires_at")
      .notNull(),

    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date()),

    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date()),
  }
);

export type Verification =
  typeof verification.$inferSelect;


/*
|--------------------------------------------------------------------------
| CATEGORY
|--------------------------------------------------------------------------
*/

export const category = pgTable(
  "category",
  {
    id: text("id").primaryKey(),

    name: text("name").notNull(),

    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),

    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    nameUnique: uniqueIndex(
      "category_name_unique"
    ).on(table.name),
  })
);

export type Category =
  typeof category.$inferSelect;

export type NewCategory =
  typeof category.$inferInsert;


/*
|--------------------------------------------------------------------------
| MENU
|--------------------------------------------------------------------------
*/

export const menu = pgTable(
  "menu",
  {
    id: text("id").primaryKey(),

    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    name: text("name").notNull(),

    imageUrl: text("image_url"),

    description: text("description"),

    available: boolean("available")
      .$defaultFn(() => true)
      .notNull(),

    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),

    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    categoryIndex: index(
      "menu_category_id_index"
    ).on(table.categoryId),

    availableIndex: index(
      "menu_available_index"
    ).on(table.available),
  })
);

export type Menu =
  typeof menu.$inferSelect;

export type NewMenu =
  typeof menu.$inferInsert;


/*
|--------------------------------------------------------------------------
| VARIANT
|--------------------------------------------------------------------------
|
| MASTER DATA VARIANT
|
| Contoh:
|
| Small
| Medium
| Large
|
| Variant tidak menyimpan harga.
|
*/

export const variant = pgTable(
  "variant",
  {
    id: text("id").primaryKey(),

    name: text("name").notNull(),

    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),

    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    nameUnique: uniqueIndex(
      "variant_name_unique"
    ).on(table.name),

    nameIndex: index(
      "variant_name_index"
    ).on(table.name),
  })
);

export type Variant =
  typeof variant.$inferSelect;

export type NewVariant =
  typeof variant.$inferInsert;


/*
|--------------------------------------------------------------------------
| MENU VARIANT
|--------------------------------------------------------------------------
|
| Menghubungkan MENU dengan VARIANT.
|
| Harga aktif menu disimpan di sini.
|
| Contoh:
|
| Thai Tea
| ├── Small  -> 7000
| └── Large  -> 12000
|
*/

export const menuVariant = pgTable(
  "menu_variant",
  {
    id: text("id").primaryKey(),

    menuId: text("menu_id")
      .notNull()
      .references(() => menu.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    variantId: text("variant_id")
      .notNull()
      .references(() => variant.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    price: integer("price")
      .notNull(),

    available: boolean("available")
      .$defaultFn(() => true)
      .notNull(),

    sortOrder: integer("sort_order")
      .$defaultFn(() => 0)
      .notNull(),

    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),

    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    menuVariantUnique: uniqueIndex(
      "menu_variant_menu_variant_unique"
    ).on(
      table.menuId,
      table.variantId
    ),

    menuIndex: index(
      "menu_variant_menu_id_index"
    ).on(table.menuId),

    variantIndex: index(
      "menu_variant_variant_id_index"
    ).on(table.variantId),

    availableIndex: index(
      "menu_variant_available_index"
    ).on(table.available),
  })
);

export type MenuVariant =
  typeof menuVariant.$inferSelect;

export type NewMenuVariant =
  typeof menuVariant.$inferInsert;


/*
|--------------------------------------------------------------------------
| ORDER STATUS
|--------------------------------------------------------------------------
*/

export const orderStatusEnum = pgEnum(
  "order_status",
  [
    "PENDING",
    "COMPLETED",
    "CANCELLED",
  ]
);

export type OrderStatus =
  (typeof orderStatusEnum.enumValues)[number];


/*
|--------------------------------------------------------------------------
| PAYMENT METHOD
|--------------------------------------------------------------------------
*/

export const paymentMethodEnum = pgEnum(
  "payment_method",
  [
    "CASH",
    "QRIS",
    "TRANSFER",
    "DEBIT",
    "CREDIT",
    "OTHER",
  ]
);

export type PaymentMethod =
  (typeof paymentMethodEnum.enumValues)[number];


/*
|--------------------------------------------------------------------------
| PAYMENT STATUS
|--------------------------------------------------------------------------
*/

export const paymentStatusEnum = pgEnum(
  "payment_status",
  [
    "UNPAID",
    "PAID",
    "REFUNDED",
  ]
);

export type PaymentStatus =
  (typeof paymentStatusEnum.enumValues)[number];


/*
|--------------------------------------------------------------------------
| ORDER
|--------------------------------------------------------------------------
|
| Satu record = satu transaksi / pesanan.
|
| Contoh:
|
| Order #ORD-001
| Kasir: Budi
| Total: 25000
| Pembayaran: CASH
| Dibuat: 2026-07-26
|
*/

export const order = pgTable(
  "order",
  {
    id: text("id").primaryKey(),

    orderNumber: text("order_number")
      .notNull()
      .unique(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    status: orderStatusEnum("status")
      .default("PENDING")
      .notNull(),

    paymentMethod: paymentMethodEnum(
      "payment_method"
    ),

    paymentStatus: paymentStatusEnum(
      "payment_status"
    )
      .default("UNPAID")
      .notNull(),

    subtotal: integer("subtotal")
      .notNull(),

    discount: integer("discount")
      .default(0)
      .notNull(),

    tax: integer("tax")
      .default(0)
      .notNull(),

    total: integer("total")
      .notNull(),

    paidAmount: integer("paid_amount")
      .default(0)
      .notNull(),

    changeAmount: integer("change_amount")
      .default(0)
      .notNull(),

    notes: text("notes"),

    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),

    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),

    completedAt: timestamp(
      "completed_at"
    ),

    cancelledAt: timestamp(
      "cancelled_at"
    ),
  },
  (table) => ({
    userIndex: index(
      "order_user_id_index"
    ).on(table.userId),

    statusIndex: index(
      "order_status_index"
    ).on(table.status),

    paymentStatusIndex: index(
      "order_payment_status_index"
    ).on(table.paymentStatus),

    createdAtIndex: index(
      "order_created_at_index"
    ).on(table.createdAt),

    paymentMethodIndex: index(
      "order_payment_method_index"
    ).on(table.paymentMethod),
  })
);

export type Order =
  typeof order.$inferSelect;

export type NewOrder =
  typeof order.$inferInsert;


/*
|--------------------------------------------------------------------------
| ORDER ITEM
|--------------------------------------------------------------------------
|
| Satu record = satu jenis item yang dibeli.
|
| DATA SNAPSHOT
|
| menuName
| variantName
| unitPrice
|
| sengaja disimpan ulang agar HISTORY TRANSAKSI
| tidak berubah ketika master data diubah.
|
| Contoh:
|
| Saat transaksi:
|
| Thai Tea Large
| Harga: 12000
| Qty: 2
|
| Data yang tersimpan:
|
| menuId      -> ID menu asli
| menuName    -> "Thai Tea"
| variantId   -> ID variant asli
| variantName -> "Large"
| unitPrice   -> 12000
| quantity    -> 2
| subtotal    -> 24000
|
*/

export const orderItem = pgTable(
  "order_item",
  {
    id: text("id").primaryKey(),

    orderId: text("order_id")
      .notNull()
      .references(() => order.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    menuId: text("menu_id")
      .notNull()
      .references(() => menu.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    menuVariantId: text(
      "menu_variant_id"
    )
      .notNull()
      .references(() => menuVariant.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    variantId: text("variant_id")
      .notNull()
      .references(() => variant.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    /*
    |----------------------------------------------------------------------
    | SNAPSHOT MENU
    |----------------------------------------------------------------------
    */

    menuName: text("menu_name")
      .notNull(),

    /*
    |----------------------------------------------------------------------
    | SNAPSHOT VARIANT
    |----------------------------------------------------------------------
    */

    variantName: text("variant_name")
      .notNull(),

    /*
    |----------------------------------------------------------------------
    | SNAPSHOT PRICE
    |----------------------------------------------------------------------
    |
    | Harga saat transaksi terjadi.
    |
    */

    unitPrice: integer("unit_price")
      .notNull(),

    quantity: integer("quantity")
      .notNull(),

    subtotal: integer("subtotal")
      .notNull(),

    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    orderIndex: index(
      "order_item_order_id_index"
    ).on(table.orderId),

    menuIndex: index(
      "order_item_menu_id_index"
    ).on(table.menuId),

    menuVariantIndex: index(
      "order_item_menu_variant_id_index"
    ).on(table.menuVariantId),

    variantIndex: index(
      "order_item_variant_id_index"
    ).on(table.variantId),

    createdAtIndex: index(
      "order_item_created_at_index"
    ).on(table.createdAt),
  })
);

export type OrderItem =
  typeof orderItem.$inferSelect;

export type NewOrderItem =
  typeof orderItem.$inferInsert;


/*
|--------------------------------------------------------------------------
| RELATIONS
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| CATEGORY RELATIONS
|--------------------------------------------------------------------------
*/

export const categoryRelations =
  relations(
    category,
    ({ many }) => ({
      menus: many(menu),
    })
  );


/*
|--------------------------------------------------------------------------
| MENU RELATIONS
|--------------------------------------------------------------------------
*/

export const menuRelations =
  relations(
    menu,
    ({ one, many }) => ({
      category: one(category, {
        fields: [menu.categoryId],
        references: [category.id],
      }),

      menuVariants: many(
        menuVariant
      ),

      orderItems: many(
        orderItem
      ),
    })
  );


/*
|--------------------------------------------------------------------------
| VARIANT RELATIONS
|--------------------------------------------------------------------------
*/

export const variantRelations =
  relations(
    variant,
    ({ many }) => ({
      menuVariants: many(
        menuVariant
      ),

      orderItems: many(
        orderItem
      ),
    })
  );


/*
|--------------------------------------------------------------------------
| MENU VARIANT RELATIONS
|--------------------------------------------------------------------------
*/

export const menuVariantRelations =
  relations(
    menuVariant,
    ({ one, many }) => ({
      menu: one(menu, {
        fields: [
          menuVariant.menuId,
        ],
        references: [
          menu.id,
        ],
      }),

      variant: one(variant, {
        fields: [
          menuVariant.variantId,
        ],
        references: [
          variant.id,
        ],
      }),

      orderItems: many(
        orderItem
      ),
    })
  );


/*
|--------------------------------------------------------------------------
| USER RELATIONS
|--------------------------------------------------------------------------
*/

export const userRelations =
  relations(
    user,
    ({ many }) => ({
      orders: many(order),
    })
  );


/*
|--------------------------------------------------------------------------
| ORDER RELATIONS
|--------------------------------------------------------------------------
*/

export const orderRelations =
  relations(
    order,
    ({ one, many }) => ({
      user: one(user, {
        fields: [
          order.userId,
        ],
        references: [
          user.id,
        ],
      }),

      items: many(
        orderItem
      ),
    })
  );


/*
|--------------------------------------------------------------------------
| ORDER ITEM RELATIONS
|--------------------------------------------------------------------------
*/

export const orderItemRelations =
  relations(
    orderItem,
    ({ one }) => ({
      order: one(order, {
        fields: [
          orderItem.orderId,
        ],
        references: [
          order.id,
        ],
      }),

      menu: one(menu, {
        fields: [
          orderItem.menuId,
        ],
        references: [
          menu.id,
        ],
      }),

      menuVariant: one(
        menuVariant,
        {
          fields: [
            orderItem.menuVariantId,
          ],
          references: [
            menuVariant.id,
          ],
        }
      ),

      variant: one(variant, {
        fields: [
          orderItem.variantId,
        ],
        references: [
          variant.id,
        ],
      }),
    })
  );


/*
|--------------------------------------------------------------------------
| SCHEMA EXPORT
|--------------------------------------------------------------------------
*/

export const schema = {
  user,
  session,
  account,
  verification,

  category,
  menu,

  variant,
  menuVariant,

  order,
  orderItem,

  categoryRelations,
  menuRelations,
  variantRelations,
  menuVariantRelations,

  userRelations,
  orderRelations,
  orderItemRelations,
};