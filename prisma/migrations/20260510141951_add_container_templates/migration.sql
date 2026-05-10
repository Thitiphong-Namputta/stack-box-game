-- CreateTable
CREATE TABLE "ContainerTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sizeW" REAL NOT NULL,
    "sizeH" REAL NOT NULL,
    "sizeD" REAL NOT NULL,
    "maxWeight" REAL NOT NULL,
    "tareWeight" REAL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContainerTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContainerTemplate_userId_idx" ON "ContainerTemplate"("userId");
