import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Info, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useStoreSettings } from "@/lib/store-settings";
import { cancellationFeePercent, refundBreakdown } from "@/lib/policy";
import { inr } from "@/lib/store-types";
import { supportPhone } from "@/lib/store-settings";

export const Route = createFileRoute("/policy")({
  head: () => ({
    meta: [
      { title: "Cancellation, Return & Refund Policy — The Grand Zone" },
      {
        name: "description",
        content:
          "Read The Grand Zone cancellation, return and refund policy, including the processing fee deducted from prepaid refunds.",
      },
      { property: "og:title", content: "Cancellation, Return & Refund Policy — The Grand Zone" },
      {
        property: "og:description",
        content: "How cancellations, returns and refunds work at The Grand Zone.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PolicyPage,
});

function PolicyPage() {
  const settings = useStoreSettings();
  const percent = cancellationFeePercent(settings.data);
  const example = refundBreakdown(1000, percent);
  const phone = supportPhone(settings.data);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">Cancellation, Return &amp; Refund Policy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This page is maintained by The Grand Zone and explains how cancellations, returns and refunds work.
        </p>
      </header>

      <section className="rounded-2xl border-2 border-primary/40 bg-card p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Info className="h-5 w-5 text-primary" /> {percent}% processing fee on prepaid refunds
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          If you have already paid online and you cancel or return the order, a{" "}
          <strong>{percent}% payment processing fee</strong> is deducted from the amount paid and the remaining balance
          is refunded to your original payment method.
        </p>
        <div className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">
          <p className="font-medium">Example</p>
          <ul className="mt-1 space-y-1">
            <li>Amount paid: {inr(example.paid)}</li>
            <li>
              Processing fee ({percent}%): − {inr(example.fee)}
            </li>
            <li className="font-semibold">Refund you receive: {inr(example.refund)}</li>
          </ul>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Cash on Delivery orders have no processing fee — nothing has been charged, so cancelling is free.
        </p>
      </section>

      <section className="rounded-2xl bg-card p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <RotateCcw className="h-5 w-5 text-primary" /> Cancellations
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>You can cancel an order yourself while it is still marked Ordered or Packed.</li>
          <li>Once the order is shipped or out for delivery, please contact support to request a cancellation.</li>
          <li>Prepaid cancellations are refunded after deducting the {percent}% processing fee.</li>
        </ul>
      </section>

      <section className="rounded-2xl bg-card p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" /> Returns &amp; replacements
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Return or replacement requests can be raised within 7 days of delivery.</li>
          <li>Products must be unused and returned with their original packaging, tags and accessories.</li>
          <li>Damaged, defective or wrong items are replaced free of charge — no processing fee applies.</li>
          <li>For change-of-mind returns on prepaid orders, the {percent}% processing fee applies.</li>
        </ul>
      </section>

      <section className="rounded-2xl bg-card p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarClock className="h-5 w-5 text-primary" /> Refund timeline
        </h2>
        <p className="mt-2 text-sm">
          Refunds are processed manually by our team, usually within 2 working days of approval. Banks and UPI apps
          typically credit the amount within 3–7 working days after that.
        </p>
      </section>

      <section className="rounded-2xl bg-card p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Truck className="h-5 w-5 text-primary" /> Need help?
        </h2>
        <p className="mt-2 text-sm">
          Raise a request in the{" "}
          <Link to="/help" className="text-primary underline">
            Help Center
          </Link>{" "}
          or call us at{" "}
          <a href={`tel:${phone}`} className="text-primary underline">
            {phone}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
