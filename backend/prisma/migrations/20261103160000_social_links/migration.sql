CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "facebookUrl" VARCHAR(2048) NOT NULL DEFAULT '',
    "instagramUrl" VARCHAR(2048) NOT NULL DEFAULT '',
    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SiteSettings_singleton" CHECK ("id" = 1)
);

INSERT INTO "SiteSettings" ("id") VALUES (1);
