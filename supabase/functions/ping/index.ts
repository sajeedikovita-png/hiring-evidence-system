Deno.serve(() =>
  new Response(JSON.stringify({ ok: true, service: "ping" }), {
    headers: { "Content-Type": "application/json" }
  })
);
