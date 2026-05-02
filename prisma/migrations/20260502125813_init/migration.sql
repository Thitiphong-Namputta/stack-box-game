-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "containerSize" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Box" (
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
    "planId" TEXT NOT NULL,
    CONSTRAINT "Box_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sizeW" REAL NOT NULL,
    "sizeH" REAL NOT NULL,
    "sizeD" REAL NOT NULL,
    "weight" REAL NOT NULL,
    "category" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CatalogItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Plan_userId_idx" ON "Plan"("userId");

-- CreateIndex
CREATE INDEX "CatalogItem_userId_idx" ON "CatalogItem"("userId");
