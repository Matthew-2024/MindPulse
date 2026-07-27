# 心晴 MindPulse Supabase 云端同步方案

本文档描述邮箱验证码注册、账号与心理文本分离、端到端加密同步和删除/导出边界。当前实现以 Web 原型 + Supabase SQL/Edge Functions 模板交付，正式试点前仍需在 Supabase 项目中配置域名、邮件服务和密钥。

## 1. 注册与验证码

当前推荐先部署单入口 `mindpulse-api` Edge Function。用户输入邮箱后，前端调用 `mindpulse-api/request-email-code`。

服务端动作：

1. 规范化邮箱，计算 `email_hash`。
2. 检查频率限制：同邮箱 60 秒内不可重复发送，1 小时最多 5 次。
3. 生成 6 位数字验证码。
4. 用服务端 `CODE_HASH_SECRET` 对 `email_hash + code` 做 HMAC hash。
5. 只保存 `code_hash`、`expires_at`、`attempts`、`created_at`，不保存明文验证码。
6. 通过 Resend 或其他邮件服务发送验证码。

用户提交验证码后，前端调用 `mindpulse-api/verify-email-code`。

服务端动作：

1. 校验 6 位验证码格式。
2. 查找未消费、未过期的最新验证码。
3. 最多允许 5 次尝试。
4. 验证通过后创建或更新 `accounts`。
5. 写入 `devices`，创建 `vaults` 关系。
6. 生成长期会话 token，并用 `HttpOnly; Secure; SameSite=Strict` Cookie 返回。

## 2. 身份信息与心理文本分离

`accounts` 只保存：

- `id`
- `email_hash`
- `email_encrypted`，可选
- `email_verified_at`
- `created_at`

每个本地档案生成随机 `vault_id`，格式类似：

```text
vault_2f4e9b4e-2f6a-4d4a-98da-2bd5224bb8c1
```

心理文本、日记、评估内容、日报和周报都归属 `vault_id`。前端导出和设置页会显示 `vault_id`，但不会把邮箱写进心理记录主键。

## 3. 本地保存

Web 原型保留两层本地数据：

| 层 | 用途 |
|---|---|
| `localStorage` | 兼容当前单 HTML 原型、保存账号状态、同步开关和非敏感 UI 状态 |
| `IndexedDB` | 保存当前 vault 的原始心理记录、干预反馈、问卷历史和待办 |

本地不保存明文密码。验证码不落本地。正式 Web 端长期 refresh token 应放在 HttpOnly Secure Cookie，不放入 localStorage。

## 4. 云端最小数据

云端保存：

- 邮箱账号元数据。
- 设备列表。
- 同步授权状态。
- 加密后的数据 blob。

云端不保存：

- 明文心理文本。
- 明文日记、评估内容、备注。
- 可直接把邮箱和心理文本连起来的字段。

如需标题、标签、摘要，也应在本地生成并加密后上传。

## 5. 加密同步

注册后不会默认上传心理文本。用户必须在设置页手动点击“开启加密同步”。

开启时，前端会：

1. 先把当前 vault 数据保存到 IndexedDB。
2. 构造 vault 快照。
3. 使用 WebCrypto 在本地加密。
4. 只向 `mindpulse-api/sync-vault` 上传 `ciphertext`、`nonce`、`salt`、`algorithm`、`keyVersion`、`kdf` 和 `iterations`。

`sync-vault` 动作会拒绝包含 `records`、`note` 或 `plaintext` 的请求，避免误把明文传到云端。

当前原型使用用户本次输入的同步密码，通过随机 `salt` 和 PBKDF2-SHA256 派生 AES-GCM 密钥；同步密码不保存。恢复时，前端先调用 `get-vault-copy` 取回密文及算法参数，再要求用户重新输入密码并在本地解密，成功后写回 IndexedDB。

当前原型的端到端加密边界仍可以继续升级为：

- 设备本地生成随机数据密钥。
- 用户设置恢复密码或恢复码。
- 用恢复密码派生 KEK 包裹数据密钥。
- 云端只保存被包裹的数据密钥和密文数据。

## 6. 数据模型

已提供迁移文件：

```text
supabase/migrations/20260618_mindpulse_secure_sync.sql
```

核心表：

- `accounts`
- `email_verifications`
- `devices`
- `sessions`
- `vaults`
- `encrypted_items`

`encrypted_items.ciphertext` 才保存真正的心理文本副本，而且必须是客户端加密后的内容。

## 7. 部署提示

需要在 Supabase 中配置环境变量：

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
EMAIL_HASH_PEPPER=...
CODE_HASH_SECRET=...
RESEND_API_KEY=...
MAIL_FROM="MindPulse <your-domain@example.com>"
ALLOWED_ORIGINS="https://your-site.example"
COOKIE_SAMESITE=None
COOKIE_SECURE=true
DEV_RETURN_CODE=false
```

`DEV_RETURN_CODE=true` 仅用于内部联调时临时返回验证码，正式试用和公开演示不要开启。正式 Web 端建议部署在 HTTPS 域名下，以便浏览器保留 `HttpOnly; Secure` 会话 Cookie。

本项目不要求部署本地 Supabase。推荐直接连线上 Supabase 项目，数据库迁移和 Edge Functions 都远程部署。

远程登录与关联：

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
```

设置线上 secrets：

```bash
npx supabase secrets set --env-file supabase/.env
```

推送数据库迁移：

```bash
npx supabase db push
```

部署函数：

```bash
npx supabase functions deploy mindpulse-api --no-verify-jwt --use-api
```

如需拆分维护，也可部署五个独立函数模板：

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

为避免 `file://` 下的 CORS 和 Cookie 问题，建议用本地静态服务器打开 Web 原型：

```bash
npm.cmd run serve:web
```

## 8. 自查口径

推荐答辩说法：

> 心晴的云端账号只负责邮箱验证、设备管理和同步授权。心理文本先在本地以 vault_id 归档，再加密上传到 Supabase encrypted_items；云端只看到 vault_id 和密文 blob，看不到“邮箱 + 心理文本”的直接关联。

禁用说法：

- “云端会分析用户心理文本。”
- “注册后自动同步全部心理数据。”
- “邮箱账号下保存用户日记。”
- “平台可以直接查看用户记录。”
