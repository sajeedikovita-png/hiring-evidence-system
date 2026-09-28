import { createHiringSupabaseClient } from "./supabaseClient";

type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }> };

export async function confirmFoundingPayment(input: { companyId: string; paidAt: string; paymentReference: string }, client: RpcClient = createHiringSupabaseClient()): Promise<{ founderSlot: number; priceLockEndsAt: string }> {
  if (!input.companyId.trim() || !input.paymentReference.trim() || !Number.isFinite(Date.parse(input.paidAt))) throw new Error("Enter a company, valid payment date, and payment reference.");
  if (Date.parse(input.paidAt) > Date.now()) throw new Error("Payment date cannot be in the future.");
  const { data, error } = await client.rpc("confirm_launch_founder_payment", { p_company_id: input.companyId, p_paid_at: input.paidAt, p_payment_reference: input.paymentReference.trim() });
  if (error) throw new Error(error.message || "Payment confirmation could not be recorded.");
  const result = data as { founderSlot?: unknown; priceLockEndsAt?: unknown } | null;
  if (!result || typeof result.founderSlot !== "number" || result.founderSlot < 1 || result.founderSlot > 5 || typeof result.priceLockEndsAt !== "string" || !Number.isFinite(Date.parse(result.priceLockEndsAt))) throw new Error("Payment confirmation response was invalid.");
  return { founderSlot: result.founderSlot, priceLockEndsAt: result.priceLockEndsAt };
}
