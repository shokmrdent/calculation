# うちトレ ログイン・課金システム　セットアップガイド

## ファイル構成

```
public/
├── login.html          ← ログインページ
├── signup.html         ← 新規登録 + Stripeカード登録
├── settings.html       ← 個人設定（プロフィール・解約など）
├── contact.html        ← お問い合わせ（ユーザー用）
├── admin/
│   ├── index.html      ← 管理者ダッシュボード（分析）
│   ├── accounts.html   ← アカウント管理
│   └── messages.html   ← お問い合わせ管理
└── assets/
    ├── firebase-config.js  ← ★ここに設定を記入
    ├── auth.js             ← 認証・セッション管理
    └── shared-auth.css     ← 共通CSS

functions/
├── index.js            ← Cloud Functions（Stripe連携）
└── package.json

firestore.rules         ← セキュリティルール
```

---

## ステップ1：Firebase の設定

1. [Firebase Console](https://console.firebase.google.com/) を開く
2. プロジェクト（pearl-survey）を選択
3. 「プロジェクトの設定」→「マイアプリ」→ CDNの設定をコピー
4. `public/assets/firebase-config.js` の `FIREBASE_CONFIG` に貼り付け

### Firebase で有効化が必要なもの
- Authentication → メール/パスワード　を有効化
- Firestore Database → 本番モードで作成
- Functions → 有効化（Blazeプラン必須）

---

## ステップ2：Stripe の設定

1. [Stripe ダッシュボード](https://dashboard.stripe.com/) を開く
2. 「商品」→「新しい商品を追加」
   - 名前: うちトレ 月額プラン
   - 価格: ¥980 / 月（繰り返し）
3. 作成された Price ID（`price_...`）をコピー
4. `public/assets/firebase-config.js` の `STRIPE_PRICE_ID` に貼り付け
5. 公開可能キー（`pk_test_...`）を `STRIPE_PUBLISHABLE_KEY` に設定

---

## ステップ3：Cloud Functions の設定

```bash
# 1) functions フォルダで依存関係をインストール
cd functions
npm install

# 2) Stripe のシークレットキーを設定
firebase functions:config:set stripe.secret_key="sk_test_YOUR_SECRET_KEY"
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"

# 3) Functions をデプロイ
firebase deploy --only functions
```

### Stripe Webhook の設定
1. Stripe ダッシュボード → 「Webhook」→「エンドポイントを追加」
2. URL: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/stripeWebhook`
3. 監視するイベント:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Webhook の署名シークレット（`whsec_...`）を上記のコマンドで設定

---

## ステップ4：Firestore セキュリティルール のデプロイ

```bash
firebase deploy --only firestore:rules
```

---

## ステップ5：管理者アカウントの作成

Firebase Console → Firestore → `users` コレクションに手動で管理者を追加：

```
ドキュメントID: {FirebaseのUID}
フィールド:
  - name: "管理者の名前"
  - email: "admin@example.com"
  - role: "admin"
  - subscriptionStatus: "admin"
  - maxConcurrentSessions: 5
  - createdAt: (タイムスタンプ)
```

Firebase Authentication でも同じメールアドレスでアカウントを作成しておく。

---

## ステップ6：既存のページにリンクを追加

`top-home.html` などに以下のリンクを追加：

```html
<!-- ナビゲーションに追加 -->
<a href="/settings.html">⚙️ 設定</a>
<a href="/contact.html">💬 お問い合わせ</a>
<button onclick="signOutUser()">ログアウト</button>
```

既存ページにも認証ガードを追加する場合：

```html
<!-- Firebase SDKs（headに追加） -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
<script src="/assets/firebase-config.js"></script>
<script src="/assets/auth.js"></script>

<!-- bodyの最後に追加 -->
<script>
  requireAuth(); // ログインしていない場合は login.html へリダイレクト
</script>
```

---

## 1デバイス制限の仕組み

- ログイン時：Firestore の `sessions/{uid}` にデバイスIDとセッショントークンを保存
- 既に別デバイスでログイン中の場合：古いセッションを削除して新しいデバイスを登録
- ページロード時：保存されたトークンとFirestoreのトークンを照合
- 不一致の場合：自動的にログアウト → login.html へ
- 管理者から `maxConcurrentSessions` を変更することで、複数台同時接続も可能

---

## Firestoreのデータ構造

```
users/{uid}
  - name, birthday, email, phone
  - role: "user" | "admin"
  - subscriptionStatus: "active" | "canceled" | "pending" | "past_due"
  - maxConcurrentSessions: 1（デフォルト）
  - stripeCustomerId, stripeSubscriptionId
  - subscriptionNextDate, subscriptionStartAt, canceledAt

sessions/{uid}
  - devices: [{ deviceId, token, lastSeen, userAgent }]

tickets/{ticketId}
  - uid, userName, userEmail, subject
  - messages: [{ role, text, createdAt }]
  - status: "open" | "closed"
  - unreadAdmin, unreadUser
```
