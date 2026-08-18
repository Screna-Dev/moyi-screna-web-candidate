# Subscription API — 前端接入后的问题清单与改动请求

对照《用户订阅（Subscription）APIs — 前端接入指南》完成前端接入后整理。分三部分：

1. [需要后端改动的请求](#一需要后端改动的请求)（按优先级）
2. [需要产品 / 法务定稿的冲突](#二需要产品--法务定稿的冲突)
3. [前端已按文档修正的内容](#三前端已按文档修正的内容)——供后端确认我们的理解是否正确

---

## 一、需要后端改动的请求

### P0-1 暴露"这次取消能否退款"

**现状**：`POST /payments/subscriptions/cancel` 有两条路径（3 天内退款 + 立即结束 / 到期不续订），但：

- 判断依据 `firstSubRefundUsed` **不在 `SubscriptionDto` 里**，前端拿不到；
- 两条路径的响应**完全一致**（都是 `200 {"message":"Subscription canceled"}`）；
- 所以前端在用户点"取消"**之前无法告知后果**，点完之后也只能靠轮询 `GET` 观察 `status` 变成 `CANCELED` 还是 `cancelAtPeriodEnd` 变成 `true` 来倒推。

**为什么重要**：这两种后果对用户完全不同 ——「立刻失去访问 + 退全款」vs「继续用到期末 + 不退款」。用户有权在点按钮之前知道是哪一种。仅凭 `firstSubAt` 推算会误判：曾经退款过、之后重新订阅的用户，`firstSubAt` 仍是老值，前端会显示"可退款"而后端实际走到期取消。

**请求**（任一即可，按优先级）：

```
A. SubscriptionDto 增加  refundEligible: boolean
   —— 后端已经知道答案（firstSubAt + firstSubRefundUsed + 当前时间），直接给结论最好，
      前端不需要复制这套业务规则。
B. 或者 SubscriptionDto 增加  refundEligibleUntil: ISO-8601 | null
   —— 不可退时为 null；可退时给截止时间，前端还能顺便做倒计时文案。
C. 或者至少暴露  firstSubRefundUsed: boolean
   —— 前端自己结合 firstSubAt 判断（次优：业务规则被复制到前端）。
```

**另外**：`cancel` 的响应里能否带上实际走了哪条路径？例如
`{"type": "REFUNDED" | "SCHEDULED", "refundAmount": 799, "periodEndAt": "..."}`。
有了它前端就不必为了确认结果而轮询。

---

### P0-2 更新支付方式的入口

**现状**：`PAST_DUE` 状态下文档建议前端提示"支付失败，请更新支付方式"，但**整套 API 里没有任何可以更新支付方式的端点**。这个提示目前无处可去 —— 用户看到警告但点不了任何东西，只能等 Stripe 重试耗尽变成 `UNPAID`。

**请求**：提供一个 Stripe Billing Portal session 接口：

```
POST /payments/billing-portal
→ { "url": "https://billing.stripe.com/p/session/..." }
```

前端整页跳转过去即可（和 Checkout 一样）。Billing Portal 顺带解决了更换卡、查看历史账单、下载发票等一堆需求，成本很低。

---

### P1-1 Checkout 回跳地址加上成功标记

**现状**：`success_url` 和 `cancel_url` 是同一个地址（`/settings?tab=billing`），前端**无法区分"付款成功"和"用户点了返回"**。

**当前前端的处理**（临时方案）：跳转 Checkout 前往 `sessionStorage` 写一个 `pendingCheckout` 标记，回来后如果标记存在就进入"确认支付中"并轮询。缺点：用户在 Stripe 页面直接关标签页、然后从别处重新打开 billing 页，标记就丢了或误留；换浏览器/换设备完成支付也拿不到标记。

**请求**：`success_url` 附加一个参数，例如

```
success_url = https://www.screna.ai/settings?tab=billing&checkout=success
cancel_url  = https://www.screna.ai/settings?tab=billing&checkout=cancelled
```

有了它前端就能直接从 URL 判断，`sessionStorage` 那套可以删掉。

---

### P1-2 写操作能否同步落库（或提供一个可查询的操作状态）

**现状**：除 `cancel-pending-downgrade` 外所有写操作都是"通知 Stripe 后立即返回 200"，本地状态等 webhook → EventBridge → SQS → worker 回写。前端因此必须在每个操作后轮询 `GET` 最长 30s，期间按钮 loading；超时只能显示"处理中，请稍后刷新"。

**影响**：升级尤其难受 —— 用户点了"确认支付"，要盯着 loading 等几秒到几十秒，还可能等到超时看到一句"处理中"，而钱其实已经扣了。

**请求**（任一）：

```
A. 变更成功后在返回前先写本地库（像 cancel-pending-downgrade 那样），
   webhook 回来时做对账/纠偏。
B. 或返回一个操作 id：
   POST /subscriptions/tier → { "type":"UPGRADE", "operationId":"op_123" }
   GET  /payments/operations/op_123 → { "state":"PENDING"|"APPLIED"|"FAILED", "message":"..." }
   这样前端可以精确显示进度，失败也能明确告知（现在失败和"还没到"前端分不出来）。
```

**特别是 `PENDING_IF_INCOMPLETE`**：升级时卡被拒，接口仍返回 200，套餐永远不切换。目前前端**没有任何办法知道扣款失败了** —— 只能轮询到超时，然后显示"处理中"，而真相是"失败了，请换卡"。这是 A/B 两个方案都需要覆盖的场景。

---

### P1-3 legacy 套餐（STARTER / PREMIUM）的迁移出口

**现状**：legacy 用户的 `/tier` 和 `/billing-cycle` 全部 400，`POST /subscriptions`（新购）也因"已有订阅"被拒。所以他们**没有任何自助换套餐的路径**，只能「先取消 →（到期或退款后）→ 重新订阅」。

前端已按此实现：legacy 用户的 Switch plan 按钮禁用并说明原因，只保留取消。

**请求**：确认这是否是期望的最终形态。如果希望这些用户能平滑迁移，需要后端提供：
- 允许 legacy → 现售 tier 的一次性迁移接口，或
- 运营侧批量把存量 legacy 行改成对应的现售 `memberPlan`。

存量规模多大？如果只有个别测试账号，直接清数据可能比做接口更划算。

---

### P2-1 `SubscriptionDto` 建议补充的字段

| 字段 | 用途 | 备注 |
|---|---|---|
| `nextBillingAmount` (cent) | 下期应付金额 | 目前前端按 tier 硬编码价格（`$7.99/$29.99/$79.99`）来显示，价格一改就不一致。降级待生效时更是错的 —— 显示的是当前档位价格而不是下期实际扣款 |
| `currency` | 同上 | 现在前端默认 `usd` |
| `paymentMethodBrand` / `paymentMethodLast4` | 退款/取消文案里指明"退回到 Visa ···4242" | 现在只能写"你的原支付方式"，不够具体 |
| `downgradePendingEffectiveAt` | 待降级的生效时间 | 现在前端用 `currentPeriodEnd` 代替。多数情况相同，但如果后端有别的口径，前端会显示错日期 |

### P2-2 `GET /payments/credits` 的 `resetDate` / `monthlyAllowance`

前端 UI 有"下次重置"和"本期额度"的位置，但这两个字段接口不返回，目前恒为空。如果规划里有，麻烦补上；如果不打算给，我们把这两处 UI 去掉。

（`recurringCreditBalance` 可能为负这点已确认，前端不做 clamp，会原样显示负值。）

---

## 二、需要产品 / 法务定稿的冲突

### 退款政策目前站内没有一份正确的说明

原先承载退款条款的 `premium-consent-modal.tsx`（§4.3：3 天全额退款）**已随 Premium 套餐和整套 premium onboarding 一起删除**。删除后站内只剩两处表述，而且**都和实际行为不符**：

| 位置 | 表述 | 与后端实现是否一致 |
|---|---|---|
| `terms.tsx` §14（唯一有法律效力的文本） | "access continues for **30 days** following cancellation. All paid fees are **non-refundable** except as required by applicable law." | ❌ 双重错误：既不是 30 天（是到当期期末），也不是完全不可退（首订 3 天内实际会全额退款） |
| 首页 FAQ | "We offer a 3-day money-back guarantee on all paid plans… reach out and we'll refund you in full" | ⚠️ 天数对，但没说是"首订一次性"，也暗示需要人工联系（实际是自助） |

**这是当前最需要处理的合规问题**：产品实际在退款，而唯一有约束力的条款写的是"不可退"，同时 FAQ 又承诺了一个比实现更宽的口径（"all paid plans" 听起来像每期都能退）。需要产品 + 法务出一份准确的退款条款，写明：

- 窗口从**首次订阅**起算 3 个自然日，**仅一次**，续费不重开；
- 窗口内取消 = 立即失去访问 + 全额退款（5–10 个工作日到账）；
- 窗口外取消 = 用到当期期末，不退款；
- 单独购买的 credits 不可退。

定稿之前前端的退款文案只能写成有保留的措辞（"if this subscription qualifies…"）。

### 待确认：取消后 `downgradePendingPlan` 会被清空吗

用户先安排了降级、之后又取消订阅（文档第二节确认 `待降级` 状态下 cancel 是允许的）。此时：

- 降级只在**下一个续费周期**落地，而取消之后没有下一个周期 → 降级实际上永远不会执行；
- 但文档没说 `downgradePendingPlan` 是否会被后端清成 `null`。

**如果不清空**，`GET` 会同时返回 `cancelAtPeriodEnd: true` 和 `downgradePendingPlan: BASIC_MONTHLY`，字面读起来是自相矛盾的（"9月17日结束访问" + "9月17日改为 Basic"）。

前端已按"取消覆盖降级"处理：待取消时隐藏降级提示和撤销按钮，并告知用户"恢复订阅会把这个待生效的变更一起恢复"。**请确认这个理解正确**，以及：

1. 取消时后端会不会顺手清空 `downgradePendingPlan`？
2. 组合状态（`cancelAtPeriodEnd=true` + `downgradePendingPlan≠null`）下，文档第二节的表格显示 `cancel-pending-downgrade` 返回 ❌ 400 —— 即用户必须先 `resume` 才能撤销降级。确认是这样吗？
3. `resume` 之后那个待降级是否会**原样恢复**？（前端目前是这么告知用户的。）

---

## 三、前端已按文档修正的内容

供后端核对我们的理解是否正确。都已合并，测试覆盖。

| # | 之前的错误实现 | 现在（按文档） |
|---|---|---|
| 1 | 退款窗口从 `currentPeriodStart`（最近一次付款）算，每期重开 | 从 `firstSubAt` 算，一次性；续费不重开 |
| 2 | legacy tier 归一化成 `null` → 整个订阅模块隐藏，**legacy 用户连取消都点不到** | 保留记录并标记 `isLegacyPlan`，模块正常渲染，Switch plan 禁用+说明，取消可用 |
| 3 | 有待降级时只禁用那一个档位，选其他档位仍会提交（必然 400） | 待降级/待取消/legacy/past_due 时整个 Switch plan 禁用，并给出原因和对应出口（Cancel change / Reactivate） |
| 4 | 待取消（`cancelAtPeriodEnd=true`）时 Switch plan 仍可点 → 400 | 同上，禁用并提示先 Reactivate |
| 5 | 把 200 当成"已生效"，立即 refresh + 弹"已升级"；升级扣款失败也会显示成功 | 每个写操作后轮询 `GET`（2s 间隔 / 30s 上限）直到目标状态出现；超时显示"处理中，请稍后刷新"而不是失败。`cancel-pending-downgrade` 不轮询 |
| 6 | 取消后直接断言走了哪条路径 | 轮询观察结果：`status=CANCELED` → 按退款路径显示；`cancelAtPeriodEnd=true` → 按到期取消显示 |
| 7 | Checkout 回跳完全没处理，付款成功回来看到 "Free" | 跳转前写 `sessionStorage` 标记，回来后显示"确认支付中"并轮询到 `ACTIVE` |
| 8 | 权益判断口径不一：billing 页把 `UNPAID`/`INCOMPLETE` 当会员，`useUserPlan` 把 `unpaid` 当免费 | 统一为 `status ∈ {ACTIVE, PAST_DUE}`（与 `EntitlementService` 一致） |
| 9 | 没有 `PAST_DUE` 提示 | 显示 Past Due 徽章 + "支付失败，请更新支付方式"（**但目前没有可跳转的入口，见 P0-2**） |
| 10 | `days_since_subscribed` 埋点恒为 null | 用 `firstSubAt` 计算 |
| 11 | 待取消 + 待降级同时存在时，界面同时显示"到期结束访问"和"到期改为 Basic"，且给出一个必然 400 的撤销按钮 | 取消覆盖降级：隐藏降级提示与撤销按钮，改为告知"恢复订阅会一并恢复该变更"（见[上一节待确认项](#待确认取消后-downgradependingplan-会被清空吗)） |
| 12 | `payment_completed` 埋点挂在 `/payment-success` 页面上，而 Stripe 从不回跳到那里 → **这个事件从未上报过** | 移到 Checkout 真正的回跳落地点（billing 页轮询确认 `ACTIVE` 之后），`source: 'billing_checkout_return'` |

**已删除的死代码**（Premium 套餐下线后遗留）：`premium-consent-modal.tsx`、`membership-onboarding-modal.tsx`、`PremiumOnboardingPage.tsx`、`PaymentSuccess.tsx`，以及 `/premium-onboarding` 和 `/payment-success` 两条路由（router.tsx / vercel.json / resume-prompt-modal 排除名单同步清理）。

> 注意 `premium-onboarding-wizard.tsx` **保留**了 —— 名字里带 premium，但它实际是**投递委托（job delegation）的 onboarding**（简历 → 岗位偏好 → Managed Apply 授权），由 `job-apply-tab.tsx` 在用，与订阅套餐无关。建议后续改名以免混淆。

**已确认不在 UI 暴露**：`POST /payments/subscriptions/billing-cycle` —— 现售套餐只有 `MONTHLY`，任何调用必然报错。等季付价格上线后再开。

**待确认的小问题**：legacy 用户目前同时看到「Upgrade to Member」横幅（因为没有现售 tier）和下方的 legacy 订阅卡片。这在语义上说得通（他们确实该升级），但如果觉得别扭我们可以调整横幅逻辑。
