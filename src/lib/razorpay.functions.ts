import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { createRemoteOrder } = await import("./razorpay.server");
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("id,total,user_id")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error("Order not found");
    if (order.user_id !== context.userId) throw new Error("Unauthorized");
    const paise = Math.round(Number(order.total) * 100);
    if (paise < 100) throw new Error("Amount too small for online payment");
    return await createRemoteOrder(paise, order.id.slice(0, 30));
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orderId: z.string().uuid(),
        razorpay_order_id: z.string().min(4).max(100),
        razorpay_payment_id: z.string().min(4).max(100),
        razorpay_signature: z.string().min(16).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { isValidSignature } = await import("./razorpay.server");
    const ok = await isValidSignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature);
    if (!ok) throw new Error("Payment signature verification failed");

    const { data: order, error } = await context.supabase
      .from("orders")
      .select("id,user_id")
      .eq("id", data.orderId)
      .single();
    if (error || !order || order.user_id !== context.userId) throw new Error("Order not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: "Paid", payment_method: "Razorpay" })
      .eq("id", data.orderId);
    if (updateError) throw new Error(updateError.message);
    return { paid: true as const };
  });
