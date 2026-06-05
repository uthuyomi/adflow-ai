import type { TranslationKey } from "@/lib/i18n";

export const termsSections: { titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { titleKey: "terms.service.title", bodyKey: "terms.service.body" },
  { titleKey: "terms.accounts.title", bodyKey: "terms.accounts.body" },
  { titleKey: "terms.credits.title", bodyKey: "terms.credits.body" },
  { titleKey: "terms.ai.title", bodyKey: "terms.ai.body" },
  { titleKey: "terms.prohibited.title", bodyKey: "terms.prohibited.body" },
  { titleKey: "terms.changes.title", bodyKey: "terms.changes.body" },
  { titleKey: "terms.law.title", bodyKey: "terms.law.body" },
];

export const privacySections: { titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { titleKey: "privacy.collected.title", bodyKey: "privacy.collected.body" },
  { titleKey: "privacy.purpose.title", bodyKey: "privacy.purpose.body" },
  { titleKey: "privacy.payment.title", bodyKey: "privacy.payment.body" },
  { titleKey: "privacy.storage.title", bodyKey: "privacy.storage.body" },
  { titleKey: "privacy.third.title", bodyKey: "privacy.third.body" },
  { titleKey: "privacy.contact.title", bodyKey: "privacy.contact.body" },
];

export const tokushoRows: { labelKey: TranslationKey; valueKey: TranslationKey }[] = [
  { labelKey: "tokusho.seller", valueKey: "tokusho.sellerValue" },
  { labelKey: "tokusho.manager", valueKey: "tokusho.managerValue" },
  { labelKey: "tokusho.address", valueKey: "tokusho.addressValue" },
  { labelKey: "tokusho.email", valueKey: "tokusho.emailValue" },
  { labelKey: "tokusho.price", valueKey: "tokusho.priceValue" },
  { labelKey: "tokusho.fees", valueKey: "tokusho.feesValue" },
  { labelKey: "tokusho.payment", valueKey: "tokusho.paymentValue" },
  { labelKey: "tokusho.timing", valueKey: "tokusho.timingValue" },
  { labelKey: "tokusho.delivery", valueKey: "tokusho.deliveryValue" },
  { labelKey: "tokusho.returns", valueKey: "tokusho.returnsValue" },
];
