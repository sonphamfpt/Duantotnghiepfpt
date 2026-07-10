-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('patient', 'receptionist', 'dentist', 'cashier', 'manager');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('Recharge', 'PaymentDeduct', 'Refund');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('Morning', 'Afternoon', 'Full');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'NoShow');

-- CreateEnum
CREATE TYPE "BookingChannel" AS ENUM ('Online', 'Phone', 'Walk-in', 'Staff');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('Waiting', 'In Chair', 'Completed');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('Active', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('independent', 'plan_init', 'plan_session');

-- CreateEnum
CREATE TYPE "ToothCondition" AS ENUM ('healthy', 'decay', 'missing', 'crown', 'bridge', 'treated');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('pdf', 'image', 'prescription');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('Pending', 'Partially Paid', 'Paid');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'Card', 'Transfer', 'Wallet');

-- CreateEnum
CREATE TYPE "ResolvedAction" AS ENUM ('updated', 'cancelled');

-- CreateEnum
CREATE TYPE "LogModule" AS ENUM ('RECEPTION', 'DENTIST', 'CASHIER', 'SYSTEM', 'AUTH');

-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('INFO', 'SUCCESS', 'WARN', 'ERR');

-- CreateTable
CREATE TABLE "roles" (
    "role_id" SMALLSERIAL NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" BIGSERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "email" VARCHAR(150),
    "password_hash" VARCHAR(255),
    "full_name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "avatar_url" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "staff_permissions" (
    "user_id" BIGINT NOT NULL,
    "admission" BOOLEAN NOT NULL DEFAULT false,
    "clinical" BOOLEAN NOT NULL DEFAULT false,
    "checkout" BOOLEAN NOT NULL DEFAULT false,
    "settings" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "staff_permissions_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "room_id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "dentists" (
    "dentist_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "specialty" VARCHAR(255),
    "degree" VARCHAR(100),
    "experience_years" INTEGER,
    "cases_handled" VARCHAR(20),
    "bio" TEXT,
    "motto" TEXT,
    "default_room_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "dentists_pkey" PRIMARY KEY ("dentist_id")
);

-- CreateTable
CREATE TABLE "dentist_education" (
    "id" BIGSERIAL NOT NULL,
    "dentist_id" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dentist_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dentist_certifications" (
    "id" BIGSERIAL NOT NULL,
    "dentist_id" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dentist_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dentist_clinical_strengths" (
    "id" BIGSERIAL NOT NULL,
    "dentist_id" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dentist_clinical_strengths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dentist_work_history" (
    "id" BIGSERIAL NOT NULL,
    "dentist_id" BIGINT NOT NULL,
    "period_text" VARCHAR(100),
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dentist_work_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_tiers" (
    "tier_id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "min_points" INTEGER NOT NULL DEFAULT 0,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "membership_tiers_pkey" PRIMARY KEY ("tier_id")
);

-- CreateTable
CREATE TABLE "patients" (
    "patient_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "full_name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "date_of_birth" DATE,
    "gender" VARCHAR(10),
    "critical_allergy" TEXT,
    "medical_condition" TEXT,
    "wallet_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "loyalty_points" INTEGER NOT NULL DEFAULT 0,
    "tier_id" INTEGER NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_reason" TEXT,
    "unlocked_by_user_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "wallet_tx_id" BIGSERIAL NOT NULL,
    "patient_id" BIGINT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "WalletTxType" NOT NULL,
    "related_invoice_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("wallet_tx_id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "category_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "services" (
    "service_id" BIGSERIAL NOT NULL,
    "category_id" INTEGER,
    "name" VARCHAR(150) NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "buffer_minutes" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,

    CONSTRAINT "services_pkey" PRIMARY KEY ("service_id")
);

-- CreateTable
CREATE TABLE "clinic_operating_hours" (
    "weekday" SMALLINT NOT NULL,
    "open_time" TIME NOT NULL,
    "close_time" TIME NOT NULL,
    "lunch_start" TIME,
    "lunch_end" TIME,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "clinic_operating_hours_pkey" PRIMARY KEY ("weekday")
);

-- CreateTable
CREATE TABLE "dentist_shifts" (
    "shift_id" BIGSERIAL NOT NULL,
    "dentist_id" BIGINT NOT NULL,
    "room_id" INTEGER NOT NULL,
    "work_date" DATE NOT NULL,
    "shift_type" "ShiftType" NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "dentist_shifts_pkey" PRIMARY KEY ("shift_id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "appointment_id" BIGSERIAL NOT NULL,
    "patient_id" BIGINT NOT NULL,
    "dentist_id" BIGINT NOT NULL,
    "service_id" BIGINT NOT NULL,
    "room_id" INTEGER,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'Confirmed',
    "booking_channel" "BookingChannel" NOT NULL DEFAULT 'Online',
    "patient_notes" TEXT,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateTable
CREATE TABLE "queue_tickets" (
    "ticket_id" BIGSERIAL NOT NULL,
    "appointment_id" BIGINT,
    "patient_id" BIGINT NOT NULL,
    "dentist_id" BIGINT NOT NULL,
    "room_id" INTEGER,
    "service_id" BIGINT,
    "status" "QueueStatus" NOT NULL DEFAULT 'Waiting',
    "check_in_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "start_treatment_time" TIMESTAMP(3),
    "end_treatment_time" TIMESTAMP(3),

    CONSTRAINT "queue_tickets_pkey" PRIMARY KEY ("ticket_id")
);

-- CreateTable
CREATE TABLE "treatment_plans" (
    "plan_id" BIGSERIAL NOT NULL,
    "patient_id" BIGINT NOT NULL,
    "dentist_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'Active',
    "estimated_total_cost" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "medical_records" (
    "record_id" BIGSERIAL NOT NULL,
    "patient_id" BIGINT NOT NULL,
    "dentist_id" BIGINT NOT NULL,
    "room_id" INTEGER,
    "queue_ticket_id" BIGINT,
    "treatment_plan_id" BIGINT,
    "session_type" "SessionType" NOT NULL DEFAULT 'independent',
    "visit_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnosis" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("record_id")
);

-- CreateTable
CREATE TABLE "medical_record_teeth" (
    "id" BIGSERIAL NOT NULL,
    "record_id" BIGINT NOT NULL,
    "tooth_number" INTEGER NOT NULL,
    "condition" "ToothCondition" NOT NULL,
    "treatment_note" TEXT,

    CONSTRAINT "medical_record_teeth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_record_files" (
    "file_id" BIGSERIAL NOT NULL,
    "record_id" BIGINT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "file_size_kb" INTEGER,
    "url" TEXT,

    CONSTRAINT "medical_record_files_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "medical_record_services" (
    "record_id" BIGINT NOT NULL,
    "service_id" BIGINT NOT NULL,

    CONSTRAINT "medical_record_services_pkey" PRIMARY KEY ("record_id","service_id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "prescription_id" BIGSERIAL NOT NULL,
    "record_id" BIGINT NOT NULL,
    "instructions" TEXT,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("prescription_id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "item_id" BIGSERIAL NOT NULL,
    "prescription_id" BIGINT NOT NULL,
    "medicine_name" VARCHAR(150) NOT NULL,
    "dose" VARCHAR(100),
    "duration" VARCHAR(100),
    "note" TEXT,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "invoice_id" BIGSERIAL NOT NULL,
    "patient_id" BIGINT NOT NULL,
    "medical_record_id" BIGINT,
    "dentist_id" BIGINT,
    "room_id" INTEGER,
    "total_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "insurance_discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "member_discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "invoice_item_id" BIGSERIAL NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "service_id" BIGINT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("invoice_item_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" BIGSERIAL NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "cashier_user_id" BIGINT,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "shift_change_notifications" (
    "notif_id" BIGSERIAL NOT NULL,
    "shift_id" BIGINT,
    "shift_date" DATE NOT NULL,
    "shift_type" VARCHAR(20) NOT NULL,
    "original_dentist_id" BIGINT NOT NULL,
    "new_dentist_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_change_notifications_pkey" PRIMARY KEY ("notif_id")
);

-- CreateTable
CREATE TABLE "shift_change_affected_items" (
    "id" BIGSERIAL NOT NULL,
    "notif_id" BIGINT NOT NULL,
    "appointment_id" BIGINT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_action" "ResolvedAction",

    CONSTRAINT "shift_change_affected_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "log_id" BIGSERIAL NOT NULL,
    "module" "LogModule" NOT NULL,
    "log_type" "LogType" NOT NULL,
    "message" TEXT NOT NULL,
    "actor_user_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_name_key" ON "rooms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dentists_user_id_key" ON "dentists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_tiers_code_key" ON "membership_tiers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_phone_key" ON "patients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dentist_shifts_dentist_id_work_date_shift_type_key" ON "dentist_shifts"("dentist_id", "work_date", "shift_type");

-- CreateIndex
CREATE INDEX "appointments_dentist_id_start_time_idx" ON "appointments"("dentist_id", "start_time");

-- CreateIndex
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "queue_tickets_appointment_id_key" ON "queue_tickets"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_queue_ticket_id_key" ON "medical_records"("queue_ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_record_id_key" ON "prescriptions"("record_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_medical_record_id_key" ON "invoices"("medical_record_id");

-- CreateIndex
CREATE INDEX "system_logs_created_at_idx" ON "system_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_permissions" ADD CONSTRAINT "staff_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dentists" ADD CONSTRAINT "dentists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dentists" ADD CONSTRAINT "dentists_default_room_id_fkey" FOREIGN KEY ("default_room_id") REFERENCES "rooms"("room_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dentist_education" ADD CONSTRAINT "dentist_education_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dentist_certifications" ADD CONSTRAINT "dentist_certifications_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dentist_clinical_strengths" ADD CONSTRAINT "dentist_clinical_strengths_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dentist_work_history" ADD CONSTRAINT "dentist_work_history_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "membership_tiers"("tier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_unlocked_by_user_id_fkey" FOREIGN KEY ("unlocked_by_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_related_invoice_id_fkey" FOREIGN KEY ("related_invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dentist_shifts" ADD CONSTRAINT "dentist_shifts_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dentist_shifts" ADD CONSTRAINT "dentist_shifts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tickets" ADD CONSTRAINT "queue_tickets_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tickets" ADD CONSTRAINT "queue_tickets_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tickets" ADD CONSTRAINT "queue_tickets_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tickets" ADD CONSTRAINT "queue_tickets_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tickets" ADD CONSTRAINT "queue_tickets_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_queue_ticket_id_fkey" FOREIGN KEY ("queue_ticket_id") REFERENCES "queue_tickets"("ticket_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_treatment_plan_id_fkey" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans"("plan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_teeth" ADD CONSTRAINT "medical_record_teeth_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("record_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_files" ADD CONSTRAINT "medical_record_files_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("record_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_services" ADD CONSTRAINT "medical_record_services_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("record_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_services" ADD CONSTRAINT "medical_record_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("record_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("prescription_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("record_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cashier_user_id_fkey" FOREIGN KEY ("cashier_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_change_notifications" ADD CONSTRAINT "shift_change_notifications_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "dentist_shifts"("shift_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_change_notifications" ADD CONSTRAINT "shift_change_notifications_original_dentist_id_fkey" FOREIGN KEY ("original_dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_change_notifications" ADD CONSTRAINT "shift_change_notifications_new_dentist_id_fkey" FOREIGN KEY ("new_dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_change_affected_items" ADD CONSTRAINT "shift_change_affected_items_notif_id_fkey" FOREIGN KEY ("notif_id") REFERENCES "shift_change_notifications"("notif_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_change_affected_items" ADD CONSTRAINT "shift_change_affected_items_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
