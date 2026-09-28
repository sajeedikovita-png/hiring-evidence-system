import assert from "node:assert/strict";
import { confirmFoundingPayment } from "../src/services/foundingPriceService";

async function main() {
  let called = false;
  const client = { rpc: async (name: string, args: Record<string, unknown>) => {
    called = true;
    assert.equal(name, "confirm_launch_founder_payment");
    assert.equal(args.p_payment_reference, "invoice-149");
    return { data: { founderSlot: 1, priceLockEndsAt: "2027-09-19T00:00:00Z" }, error: null };
  } };
  await assert.rejects(() => confirmFoundingPayment({ companyId: "company1", paidAt: "2099-01-01", paymentReference: "invoice-149" }, client), /future/);
  assert.equal(called, false);
  const result = await confirmFoundingPayment({ companyId: "company1", paidAt: "2026-09-19T00:00:00Z", paymentReference: " invoice-149 " }, client);
  assert.equal(result.founderSlot, 1);
  await assert.rejects(() => confirmFoundingPayment({ companyId: "company1", paidAt: "2026-09-19T00:00:00Z", paymentReference: "invoice-149" }, { rpc: async () => ({ data: null, error: { message: "Platform administrator required" } }) }), /administrator/);
  console.log("Founding price service tests passed.");
}
void main();
