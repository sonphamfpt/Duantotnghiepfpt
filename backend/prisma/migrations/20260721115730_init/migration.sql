-- CreateEnum
CREATE TYPE "ReviewSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('Pending', 'Approved', 'Hidden');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "address" VARCHAR(255);

-- CreateTable
CREATE TABLE "service_reviews" (
    "review_id" BIGSERIAL NOT NULL,
    "patient_id" BIGINT NOT NULL,
    "appointment_id" BIGINT,
    "service_id" BIGINT,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT NOT NULL,
    "sentiment" "ReviewSentiment" NOT NULL DEFAULT 'NEUTRAL',
    "ai_reply" TEXT,
    "ai_replied_at" TIMESTAMP(3),
    "status" "ReviewStatus" NOT NULL DEFAULT 'Approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_reviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_reviews_appointment_id_key" ON "service_reviews"("appointment_id");

-- CreateIndex
CREATE INDEX "service_reviews_patient_id_idx" ON "service_reviews"("patient_id");

-- CreateIndex
CREATE INDEX "service_reviews_service_id_idx" ON "service_reviews"("service_id");

-- AddForeignKey
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE SET NULL ON UPDATE CASCADE;
