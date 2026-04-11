// =====================================================
// ⚠️ ここにFirebaseの設定を入れてください
// Firebase Console > プロジェクトの設定 > マイアプリ > CDN
// =====================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCUEv3anIy8u8oJoZ5CYLD0CI6uJX056g8",
  authDomain: "calculations-11955.firebaseapp.com",
  projectId: "calculations-11955",
  storageBucket: "calculations-11955.firebasestorage.app",
  messagingSenderId: "447128587632",
  appId: "1:447128587632:web:f21cbf9695b3d6e9cd13b5"
};

// ⚠️ Stripeの公開キー（テスト用 → 本番は pk_live_... に変更）
const STRIPE_PUBLISHABLE_KEY = "pk_test_YOUR_STRIPE_PUBLISHABLE_KEY";

// =====================================================
// プラン設定
// =====================================================
const PLANS = {
  home: {
    name:    '家庭学習プラン',
    price:   980,
    priceId: 'price_HOME_PRICE_ID',   // StripeのPrice IDに変更
  },
  juken: {
    name:    '受験対策プラン',
    price:   1480,                     // ← 受験プランの価格
    priceId: 'price_JUKEN_PRICE_ID',  // StripeのPrice IDに変更
  },
};

// 後方互換用
const MONTHLY_PRICE  = PLANS.home.price;
const STRIPE_PRICE_ID = PLANS.home.priceId;
