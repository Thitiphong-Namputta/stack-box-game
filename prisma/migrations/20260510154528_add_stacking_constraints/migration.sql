-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Box" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "color" TEXT NOT NULL,
    "category" TEXT,
    "orientationId" INTEGER NOT NULL DEFAULT 0,
    "sizeW" REAL NOT NULL,
    "sizeH" REAL NOT NULL,
    "sizeD" REAL NOT NULL,
    "posX" REAL NOT NULL,
    "posY" REAL NOT NULL,
    "posZ" REAL NOT NULL,
    "fragile" BOOLEAN NOT NULL DEFAULT false,
    "thisSideUp" BOOLEAN NOT NULL DEFAULT false,
    "nonStackable" BOOLEAN NOT NULL DEFAULT false,
    "cannotBeStackedOn" BOOLEAN NOT NULL DEFAULT false,
    "maxStackWeight" REAL,
    "hazmat" TEXT,
    "temperature" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "planId" TEXT NOT NULL,
    CONSTRAINT "Box_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Box" ("category", "color", "id", "name", "orientationId", "planId", "posX", "posY", "posZ", "sizeD", "sizeH", "sizeW", "weight") SELECT "category", "color", "id", "name", "orientationId", "planId", "posX", "posY", "posZ", "sizeD", "sizeH", "sizeW", "weight" FROM "Box";
DROP TABLE "Box";
ALTER TABLE "new_Box" RENAME TO "Box";
CREATE TABLE "new_CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sizeW" REAL NOT NULL,
    "sizeH" REAL NOT NULL,
    "sizeD" REAL NOT NULL,
    "weight" REAL NOT NULL,
    "category" TEXT,
    "fragile" BOOLEAN NOT NULL DEFAULT false,
    "thisSideUp" BOOLEAN NOT NULL DEFAULT false,
    "nonStackable" BOOLEAN NOT NULL DEFAULT false,
    "cannotBeStackedOn" BOOLEAN NOT NULL DEFAULT false,
    "maxStackWeight" REAL,
    "hazmat" TEXT,
    "temperature" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CatalogItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CatalogItem" ("category", "id", "name", "sizeD", "sizeH", "sizeW", "userId", "weight") SELECT "category", "id", "name", "sizeD", "sizeH", "sizeW", "userId", "weight" FROM "CatalogItem";
DROP TABLE "CatalogItem";
ALTER TABLE "new_CatalogItem" RENAME TO "CatalogItem";
CREATE INDEX "CatalogItem_userId_idx" ON "CatalogItem"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
