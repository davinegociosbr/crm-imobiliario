CREATE TYPE "FinancialType" AS ENUM ('RECEIVABLE', 'PAYABLE');
CREATE TYPE "FinancialStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "FinancialCategory" AS ENUM ('COMMISSION', 'RENT', 'SALE', 'SERVICE', 'TAX', 'SALARY', 'MARKETING', 'INFRASTRUCTURE', 'OTHER');

CREATE TABLE "financial_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "FinancialType" NOT NULL,
    "category" "FinancialCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "FinancialStatus" NOT NULL DEFAULT 'PENDING',
    "contactName" TEXT,
    "notes" TEXT,
    "leadId" TEXT,
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "financial_entries_companyId_idx" ON "financial_entries"("companyId");
CREATE INDEX "financial_entries_type_idx" ON "financial_entries"("type");
CREATE INDEX "financial_entries_status_idx" ON "financial_entries"("status");
CREATE INDEX "financial_entries_dueDate_idx" ON "financial_entries"("dueDate");

ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
