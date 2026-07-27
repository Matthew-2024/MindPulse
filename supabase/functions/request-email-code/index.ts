import {
  assertEmail,
  codeHash,
  corsHeaders,
  emailHash,
  json,
  normalizeEmail,
  randomCode,
  readJson,
  serviceClient,
} from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    assertEmail(email);

    const supabase = serviceClient();
    const hashedEmail = await emailHash(email);
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 60_000).toISOString();
    const oneHourAgo = new Date(now - 60 * 60_000).toISOString();

    const { count: recentCount, error: recentError } = await supabase
      .from("email_verifications")
      .select("id", { count: "exact", head: true })
      .eq("email_hash", hashedEmail)
      .gte("created_at", oneMinuteAgo);
    if (recentError) throw recentError;
    if ((recentCount ?? 0) > 0) {
      return json(req, { error: "发送太频繁，请稍后再试" }, 429);
    }

    const { count: hourlyCount, error: hourlyError } = await supabase
      .from("email_verifications")
      .select("id", { count: "exact", head: true })
      .eq("email_hash", hashedEmail)
      .gte("created_at", oneHourAgo);
    if (hourlyError) throw hourlyError;
    if ((hourlyCount ?? 0) >= 5) {
      return json(req, { error: "验证码请求次数过多，请一小时后再试" }, 429);
    }

    const code = randomCode();
    const hashedCode = await codeHash(hashedEmail, code);
    const expiresAt = new Date(now + 10 * 60_000).toISOString();
    const { error: insertError } = await supabase.from("email_verifications").insert({
      email_hash: hashedEmail,
      code_hash: hashedCode,
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("MAIL_FROM") ?? "MindPulse <onboarding@resend.dev>";
    if (resendKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: "心晴 MindPulse 邮箱验证码",
          text: `你的心晴 MindPulse 验证码是：${code}。验证码 10 分钟内有效。请勿转发给他人。`,
        }),
      });
      if (!response.ok) {
        return json(req, { error: "邮件发送失败，请稍后重试" }, 502);
      }
    } else {
      console.log(`MindPulse dev email code for ${hashedEmail}: ${code}`);
    }

    return json(req, { ok: true, expiresInSeconds: 600, resendAfterSeconds: 60 });
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "发送失败" }, 400);
  }
});
