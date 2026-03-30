# うちトレ — Firebase Hosting 2サイト分離 手順

## 1. Firebase コンソールでサイトを2つ作る

Firebase Console → Hosting → 「別のサイトを追加」

| ターゲット名 | サイトID（例） | トップページ |
|---|---|---|
| uchitore-home  | uchitore-home  | top-home.html（家庭学習） |
| uchitore-juken | uchitore-juken | top-juken.html（中学受験） |

---

## 2. .firebaserc を編集

```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"  ← 実際のプロジェクトIDに変更
  },
  "targets": {
    "YOUR_PROJECT_ID": {
      "hosting": {
        "uchitore-home":  ["uchitore-home"],   ← コンソールで作ったサイトID
        "uchitore-juken": ["uchitore-juken"]
      }
    }
  }
}
```

---

## 3. デプロイ

```bash
# 両サイト同時デプロイ
firebase deploy --only hosting

# 片方だけデプロイする場合
firebase deploy --only hosting:uchitore-home
firebase deploy --only hosting:uchitore-juken
```

---

## 4. 完成後のURL構成

```
https://uchitore-home.web.app   → 家庭学習モード（top-home.html）
https://uchitore-juken.web.app  → 中学受験モード（top-juken.html）
```

両サイトとも public/ フォルダを共有しているので、
問題ドリルページ（addition-hissan.html 等）はどちらからでもアクセス可能。

---

## 補足：将来サイトごとに public を分けたい場合

Phase 2以降で家庭学習・受験の内容が大きく異なってきたら、
public-home/ と public-juken/ に分けて firebase.json の "public" を変えるだけでOK。
