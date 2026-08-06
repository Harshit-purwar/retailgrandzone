import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { OrderItem } from "@/lib/store-types";
import type { InvoiceOrder } from "@/lib/invoice";
import { InvoiceView } from "@/components/store/InvoiceView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/invoice/$id")({
  head: () => ({
    meta: [
      { title: "Invoice — The Grand Zone" },
      { name: "description", content: "View and download the tax invoice for your The Grand Zone order." },
      { property: "og:title", content: "Invoice — The Grand Zone" },
      { property: "og:description", content: "View and download the tax invoice for your order." },
    ],
  }),
  component: InvoicePage,
});

export function useInvoiceData(id: string) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      if (orderRes.error) throw orderRes.error;
      if (itemsRes.error) throw itemsRes.error;
      return {
        order: (orderRes.data ?? null) as unknown as InvoiceOrder | null,
        items: (itemsRes.data ?? []) as unknown as OrderItem[],
      };
    },
  });
}

function InvoicePage() {
  const { id } = Route.useParams();
  const query = useInvoiceData(id);

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  const order = query.data?.order;
  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Invoice not found</h1>
        <Link to="/orders" className="mt-4 inline-block text-primary underline">
          View my orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-3 py-4 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link to="/order/$id" params={{ id }}>
            Back to order
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Download className="mr-1 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>
      <InvoiceView order={order} items={query.data?.items ?? []} />
    </div>
  );
}
