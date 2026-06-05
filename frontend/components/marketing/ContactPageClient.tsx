"use client";

import { LocalizedMetadata } from "@/components/i18n/LocalizedMetadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/use-i18n";

export function ContactPageClient() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <LocalizedMetadata titleKey="meta.contact.title" descriptionKey="meta.contact.description" />
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-primary">{t("contact.eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold">{t("contact.title")}</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{t("contact.subtitle")}</p>
      </div>
      <section className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold">{t("contact.categories.title")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            "contact.category.support",
            "contact.category.billing",
            "contact.category.partnerships",
            "contact.category.features",
            "contact.category.bugs",
          ].map((key) => (
            <div className="rounded-md border border-border bg-background p-3 text-sm font-medium" key={key}>
              {t(key)}
            </div>
          ))}
        </div>
      </section>
      <form className="mt-8 grid gap-5 rounded-lg border border-border bg-card p-5">
        <div className="grid gap-2">
          <Label htmlFor="name">{t("contact.name")}</Label>
          <Input id="name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">{t("contact.email")}</Label>
          <Input id="email" required type="email" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="topic">{t("contact.topic")}</Label>
          <Input id="topic" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="message">{t("contact.message")}</Label>
          <Textarea id="message" required rows={6} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t("contact.notice")}</p>
          <Button type="submit">{t("contact.submit")}</Button>
        </div>
      </form>
    </div>
  );
}
