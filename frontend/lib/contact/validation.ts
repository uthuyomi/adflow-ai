export type ContactPayload = {
  name?: unknown;
  email?: unknown;
  topic?: unknown;
  message?: unknown;
  locale?: unknown;
  company?: unknown;
  startedAt?: unknown;
};

export function validateContactPayload(payload: ContactPayload, now = Date.now()) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const topic = typeof payload.topic === "string" ? payload.topic.trim() : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const locale = payload.locale === "ja" ? "ja" : "en";
  const company = typeof payload.company === "string" ? payload.company.trim() : "";
  const startedAt = typeof payload.startedAt === "number" ? payload.startedAt : Number(payload.startedAt);

  if (company) return { ok: false as const, error: "Submission rejected." };
  if (!Number.isFinite(startedAt) || now - startedAt < 2_000 || now - startedAt > 7_200_000) {
    return { ok: false as const, error: "Please reload the form and try again." };
  }
  if (name.length < 2 || name.length > 100) return { ok: false as const, error: "Name must be 2-100 characters." };
  if (!/^[^\s,@]+@[^\s,@]+\.[^\s,@]+$/.test(email) || email.length > 254) {
    return { ok: false as const, error: "A valid email is required." };
  }
  if (topic.length < 2 || topic.length > 120) return { ok: false as const, error: "Topic must be 2-120 characters." };
  if (message.length < 20 || message.length > 5_000) return { ok: false as const, error: "Message must be 20-5000 characters." };

  return { ok: true as const, data: { name, email, topic, message, locale } };
}
