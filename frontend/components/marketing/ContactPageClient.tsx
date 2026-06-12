"use client";

import { useRef, useState } from "react";

import { LocalizedMetadata } from "@/components/i18n/LocalizedMetadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/use-i18n";

export function ContactPageClient() {
  const { locale, t } = useI18n();
  const startedAt = useRef(Date.now());
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        topic: data.get("topic"),
        message: data.get("message"),
        company: data.get("company"),
        locale,
        startedAt: startedAt.current,
      }),
    }).catch(() => null);
    if (!response?.ok) {
      const payload = response ? await response.json().catch(() => null) : null;
      setStatus("error");
      setMessage(payload?.error || "Unable to send your inquiry.");
      return;
    }
    setStatus("success");
    setMessage(locale === "ja" ? "お問い合わせを保存しました。" : "Your inquiry was saved.");
    form.reset();
    startedAt.current = Date.now();
  }

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
      <form className="mt-8 grid gap-5 rounded-lg border border-border bg-card p-5" onSubmit={submit}>
        <div className="hidden" aria-hidden="true">
          <Label htmlFor="company">Company website</Label>
          <Input id="company" name="company" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name">{t("contact.name")}</Label>
          <Input id="name" name="name" required minLength={2} maxLength={100} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">{t("contact.email")}</Label>
          <Input id="email" name="email" required type="email" maxLength={254} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="topic">{t("contact.topic")}</Label>
          <Input id="topic" name="topic" required minLength={2} maxLength={120} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="message">{t("contact.message")}</Label>
          <Textarea id="message" name="message" required minLength={20} maxLength={5000} rows={6} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t("contact.notice")}</p>
          <Button disabled={status === "sending"} type="submit">
            {status === "sending" ? "Sending..." : t("contact.submit")}
          </Button>
        </div>
        {message ? (
          <p className={status === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"} role="status">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
