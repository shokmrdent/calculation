const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }  = require('firebase-functions/params');
const admin             = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const STRIPE_SECRET_KEY     = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

// ── 1) サブスクリプション作成 ──────────────────────
exports.createUserSubscription = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', '要ログイン');
    const stripe = require('stripe')(STRIPE_SECRET_KEY.value());
    const uid    = request.auth.uid;
    const { paymentMethodId, priceId } = request.data;
    const userDoc = await db.collection('users').doc(uid).get();
    const user    = userDoc.data();
    if (!user) throw new HttpsError('not-found', 'ユーザーが見つかりません');
    try {
      const customer = await stripe.customers.create({
        email: user.email, name: user.name, metadata: { firebase_uid: uid },
      });
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: paymentMethodId }
      });
      const subscription = await stripe.subscriptions.create({
        customer: customer.id, items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      });
      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      await db.collection('users').doc(uid).update({
        stripeCustomerId: customer.id, stripeSubscriptionId: subscription.id,
        subscriptionStatus: 'active',
        subscriptionStartAt: admin.firestore.FieldValue.serverTimestamp(),
        subscriptionNextDate: periodEnd,
      });
      return { success: true };
    } catch (err) { throw new HttpsError('internal', err.message); }
  }
);

// ── 2) 解約 ────────────────────────────────────────
exports.cancelUserSubscription = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', '要ログイン');
    const stripe  = require('stripe')(STRIPE_SECRET_KEY.value());
    const uid     = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    const user    = userDoc.data();
    if (!user?.stripeSubscriptionId) throw new HttpsError('not-found', 'サブスクなし');
    try {
      const subscription = await stripe.subscriptions.update(
        user.stripeSubscriptionId, { cancel_at_period_end: true }
      );
      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      await db.collection('users').doc(uid).update({
        subscriptionStatus: 'canceled',
        canceledAt: admin.firestore.FieldValue.serverTimestamp(),
        subscriptionEndAt: periodEnd,
      });
      return { success: true, endsAt: periodEnd };
    } catch (err) { throw new HttpsError('internal', err.message); }
  }
);

// ── 3) 管理者によるアカウント作成 ─────────────────
exports.adminCreateAccount = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', '要ログイン');
  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== 'admin') throw new HttpsError('permission-denied', '管理者権限が必要');
  const { name, email, phone, birthday, password, role, maxConcurrentSessions } = request.data;
  if (!email || !password || !name) throw new HttpsError('invalid-argument', '名前・メール・パスワード必須');
  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName: name });
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid, name, email,
      phone: phone || '', birthday: birthday || '',
      role: role || 'user',
      subscriptionStatus: role === 'admin' ? 'admin' : 'active',
      maxConcurrentSessions: maxConcurrentSessions || 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
    });
    return { success: true, uid: userRecord.uid };
  } catch (err) {
    const m = { 'auth/email-already-exists': 'このメールはすでに使用されています' };
    throw new HttpsError('internal', m[err.code] || err.message);
  }
});

// ── 4) Stripe Webhook ──────────────────────────────
exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const stripe = require('stripe')(STRIPE_SECRET_KEY.value());
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }
    try {
      if (event.type === 'invoice.payment_succeeded') {
        const sub  = await stripe.subscriptions.retrieve(event.data.object.subscription);
        const snap = await db.collection('users').where('stripeCustomerId','==',event.data.object.customer).limit(1).get();
        if (!snap.empty) await snap.docs[0].ref.update({
          subscriptionStatus: 'active',
          subscriptionNextDate: new Date(sub.current_period_end * 1000).toISOString(),
        });
      } else if (event.type === 'invoice.payment_failed') {
        const snap = await db.collection('users').where('stripeCustomerId','==',event.data.object.customer).limit(1).get();
        if (!snap.empty) await snap.docs[0].ref.update({ subscriptionStatus: 'past_due' });
      } else if (event.type === 'customer.subscription.deleted') {
        const snap = await db.collection('users').where('stripeCustomerId','==',event.data.object.customer).limit(1).get();
        if (!snap.empty) await snap.docs[0].ref.update({
          subscriptionStatus: 'canceled',
          canceledAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      res.json({ received: true });
    } catch (err) { res.status(500).send('Internal Server Error'); }
  }
);
