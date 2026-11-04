ALTER TABLE "PricingSeason"
ADD COLUMN "minNights" INTEGER NOT NULL DEFAULT 2,
ADD CONSTRAINT "PricingSeason_minNights_check" CHECK ("minNights" >= 2);

CREATE TABLE "PricingSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "minStayTextPl" VARCHAR(2000) NOT NULL DEFAULT 'Min. długość pobytu: 2 noce',
    "minStayTextEn" VARCHAR(2000) NOT NULL DEFAULT 'Minimum stay: 2 nights',
    CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PricingSettings_singleton_check" CHECK ("id" = 1)
);

INSERT INTO "PricingSettings" ("id") VALUES (1);
