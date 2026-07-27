# MindPulse Supabase 远程部署笔记

本项目不需要启动本地 Supabase。部署目标是线上 Supabase 项目。

## 需要你提供

- Supabase project ref，例如 `abcdefghijklmnopqrst`
- Supabase project URL，例如 `https://abcdefghijklmnopqrst.supabase.co`
- 邮件服务 API Key，当前函数模板使用 Resend
- `MAIL_FROM`，建议使用已验证发信域名

## 远程部署命令

推荐先部署单入口函数 `mindpulse-api`。Web 原型会调用：

```text
https://<project-ref>.functions.supabase.co/mindpulse-api/request-email-code
https://<project-ref>.functions.supabase.co/mindpulse-api/verify-email-code
https://<project-ref>.functions.supabase.co/mindpulse-api/sync-vault
https://<project-ref>.functions.supabase.co/mindpulse-api/get-vault-copy
https://<project-ref>.functions.supabase.co/mindpulse-api/clear-vault-copy
```

登录：

```bash
npx supabase login
```

关联线上项目：

```bash
npx supabase link --project-ref <project-ref>
```

设置 secrets：

```bash
npx supabase secrets set `
  SUPABASE_URL=https://<project-ref>.supabase.co `
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key> `
  EMAIL_HASH_PEPPER=<random-secret> `
  CODE_HASH_SECRET=<random-secret> `
  RESEND_API_KEY=<resend-key> `
  MAIL_FROM="MindPulse <verify@your-domain.example>" `
  ALLOWED_ORIGINS="http://localhost:*,https://your-site.example" `
  COOKIE_SAMESITE=None `
  COOKIE_SECURE=true `
  DEV_RETURN_CODE=false
```

`DEV_RETURN_CODE=true` 只允许内部联调时临时使用，正式试用和公开演示不要开启；正式流程应配置邮件服务并发送验证码。

推送数据库迁移：

```bash
npx supabase db push
```

部署函数：

```bash
npx supabase functions deploy mindpulse-api --no-verify-jwt --use-api
```

如果后续要拆成五个独立函数，也可以部署：

```bash
npx supabase functions deploy request-email-code --no-verify-jwt --use-api
npx supabase functions deploy verify-email-code --no-verify-jwt --use-api
npx supabase functions deploy sync-vault --no-verify-jwt --use-api
npx supabase functions deploy get-vault-copy --no-verify-jwt --use-api
npx supabase functions deploy clear-vault-copy --no-verify-jwt --use-api
```

Web 原型设置页填写：

```text
https://<project-ref>.functions.supabase.co
```
