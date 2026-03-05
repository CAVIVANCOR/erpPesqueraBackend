-- AlterTable
ALTER TABLE "FaenaPesca" ADD COLUMN     "pangueroId" BIGINT;

-- AddForeignKey
ALTER TABLE "FaenaPesca" ADD CONSTRAINT "FaenaPesca_pangueroId_fkey" FOREIGN KEY ("pangueroId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
