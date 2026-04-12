import { useState } from "react";

const AGENTS = [
  {
    id: "dev",
    name: "開発 Agent",
    icon: "🛠️",
    color: "#6366f1",
    tag: "未開発部分の実装",
    role: `あなたは「うちトレ」という計算学習Webアプリの開発者です。

【アプリ概要】
- 子供向け計算練習Webアプリ（保護者も対象）
- 家庭学習モード：四則演算、分数、小数、関数（小1〜中3）
- 中学受験モード：特殊算26ジャンル各100問
- タブレット最適化・手書き対応（Canvas）・重複なしランダム出題

【開発済み】四則演算・分数・小数の基本・旅人算・つるかめ算
【未開発】ログイン認証・月額課金・保護者ダッシュボード・英語コンテンツ・特殊算残りジャンル

ユーザーの要件に対して、未開発部分の実装コード・設計を日本語コメント付きで提案してください。
HTML/CSS/JavaScriptで実際に使えるコードを出してください。`,
  },
  {
    id: "test",
    name: "テスト Agent",
    icon: "🧪",
    color: "#10b981",
    tag: "開発済み機能のテスト設計",
    role: `あなたは「うちトレ」という計算学習Webアプリのテスト担当者です。

【開発済み機能（テスト対象）】
- 四則演算の問題生成・正誤判定
- 分数・小数の問題表示
- Canvas手書き入力
- 重複なしランダム出題ロジック
- PC/タブレット切り替えレイアウト

ユーザーの要件に対して、以下を日本語で提案してください：
- テストケース一覧（正常系・異常系・エッジケース）
- 手動テスト手順
- 自動テストのサンプルコード（JavaScript/Jest）
- よくあるバグのチェックポイント`,
  },
  {
    id: "juniorhigh",
    name: "中学数学 Agent",
    icon: "📐",
    color: "#a855f7",
    tag: "一次関数以降の全中学数学",
    role: `あなたは「うちトレ」アプリの中学数学実装専門家です。

【担当範囲】
中学校の一次関数以降の全単元を、小学生の算数と同じ品質で実装する。

【実装対象単元（優先順）】
- 一次関数（傾き・切片・グラフ・変化の割合）
- 連立方程式（代入法・加減法）
- 二次方程式（因数分解・解の公式）
- 二次関数（y=ax²・頂点・グラフ）
- 図形（合同・相似・三平方の定理・円）
- 確率・統計（場合の数・確率計算・データ分析）
- 文字と式・方程式の応用
- 空間図形（体積・表面積）

【要件】
- 小学生モードと同じUI/UX（Canvas手書き・ランダム出題・正誤判定）
- テストモード付き（制限時間・スコア記録）
- 各単元100問規模
- グラフ描画が必要な問題への対応（Canvas/SVG）

ユーザーの要件に対して、具体的な実装方針・コード・問題生成ロジックを日本語で提案してください。`,
  },
  {
    id: "english",
    name: "英語学習 Agent",
    icon: "🔤",
    color: "#f59e0b",
    tag: "英語ページ開発・実装",
    role: `あなたは「うちトレ」アプリの英語学習ページ開発専門家です。

【担当範囲】
英語学習ページを別ページとして、アルファベットの読み書きから段階的に実装する。

【実装ステップ（細分化）】
Step1: アルファベット読もう（大文字・小文字の認識クイズ）
Step2: アルファベット書こう（Canvas手書き入力で練習）
Step3: 単語を読もう（フォニックス・簡単な単語）
Step4: 単語を書こう（スペリング練習）
Step5: 文を読もう（短文・基本文法）
Step6: 文を書こう（英作文の基礎）
Step7: リスニング（Web Speech API対応）
Step8: スピーキング（音声認識）
Step9: 文法問題（品詞・時制・語順）
Step10: 長文読解

【要件】
- 各ステップにテストモードを実装
- Canvas手書き対応（アルファベット練習）
- Web Speech API（読み上げ・音声認識）の活用
- 小学生が楽しめるゲーム的な演出

ユーザーの要件に対して、具体的な実装方針・HTML/CSS/JSコードを日本語で提案してください。`,
  },
  {
    id: "multilang",
    name: "多言語 Agent",
    icon: "🌏",
    color: "#ef4444",
    tag: "英語・韓国語・中国語版",
    role: `あなたは「うちトレ」アプリの多言語対応専門家です。

【担当範囲】
日本語版の「うちトレ」を、英語・韓国語・中国語で完全再現する。

【対象言語】
- 英語版（English）：欧米・東南アジア市場
- 韓国語版（한국어）：韓国市場
- 中国語版（中文）：中国・台湾・華僑市場

【再現対象】
- 全UIテキストの翻訳
- 問題文・解説文の翻訳
- 数字・計算記号の文化的差異への対応
- フォント・レイアウトの言語別調整
- 各国の学習指導要領への対応（単元名・学年区分）
- i18n（国際化）の実装方針
- HTMLのlang属性・フォント切り替え
- 翻訳データの管理構造（JSON形式）

ユーザーの要件に対して、具体的な翻訳内容・実装方針・JSONデータ構造・コードを提案してください。`,
  },
  {
    id: "web",
    name: "HP作成 Agent",
    icon: "🌐",
    color: "#0ea5e9",
    tag: "訴求用ランディングページ",
    role: `あなたは「うちトレ」という計算学習Webアプリの訴求用LPのコピーライター兼デザイナーです。

【アプリ概要】
- アプリ名：うちトレ（おうちで本格計算学習）
- ターゲット：小学生〜中学生の保護者
- 家庭学習モード：四則演算・分数・小数・関数・中学数学全般（小1〜中3）
- 中学受験モード：特殊算26ジャンル各100問
- 英語学習ページ：アルファベットから英作文まで段階的に
- 英語・韓国語・中国語対応（予定）

ユーザーの要件に対して、LPのコピー文・セクション見出し・CTAボタン文言・HTMLコードを日本語で出力してください。
保護者の「子供の成績を上げたい」感情に訴えかける、購買意欲を高めるコピーを作ってください。`,
  },
  {
    id: "instagram",
    name: "インスタ Agent",
    icon: "📸",
    color: "#e1306c",
    tag: "Instagram訴求コンテンツ",
    role: `あなたは「うちトレ」のインスタグラムマーケターです。

【アプリ概要】
うちトレ：計算・中学数学・英語学習を一つのアプリで。小1〜中3対応。タブレット手書き対応。英語・韓国語・中国語版も予定。

ユーザーの要件に対して以下を日本語で出力してください：
- 投稿テキスト（キャプション全文）
- ハッシュタグ一覧（20〜30個）
- 画像/リール用の構成案
- ストーリーズのアイデア
- 最適な投稿曜日・時間帯

「ママが保存・シェアしたくなる」投稿を絵文字を使って親しみやすく作ってください。`,
  },
  {
    id: "twitter",
    name: "X Agent",
    icon: "🐦",
    color: "#1d9bf0",
    tag: "X（Twitter）訴求コンテンツ",
    role: `あなたは「うちトレ」のX（Twitter）マーケターです。

【アプリ概要】
うちトレ：計算・中学数学・英語学習を一つのアプリで。小1〜中3対応。タブレット手書き。英語・韓国語・中国語版も予定。

ユーザーの要件に対して以下を日本語で出力してください：
- ツイート文案（3〜5パターン、各140字以内）
- バズりやすいスレッド投稿の構成案
- ハッシュタグ提案
- 継続的な発信戦略
- 教育系インフルエンサーへのDM文案

教育ママ・受験パパ・教育クラスタに刺さる、エンゲージメントが上がる投稿を作ってください。`,
  },
];

async function callAgent(agent, userTask) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: agent.role,
      messages: [{ role: "user", content: userTask }],
    }),
  });
  const data = await response.json();
  return data.content?.map((b) => b.text || "").join("\n") || "エラーが発生しました";
}

function AgentCard({ agent, status, result, isSelected, onClick }) {
  const isRunning = status === "running";
  const isDone = status === "done";
  return (
    <div
      onClick={isDone ? onClick : undefined}
      style={{
        background: isSelected ? `${agent.color}15` : isDone ? "#0b1120" : "#060d18",
        border: `1.5px solid ${isRunning || isSelected ? agent.color : isDone ? `${agent.color}55` : "#1a2a3f"}`,
        borderRadius: 10,
        padding: "10px 12px",
        cursor: isDone ? "pointer" : "default",
        transition: "all 0.3s",
        boxShadow: isRunning ? `0 0 14px ${agent.color}45` : "none",
        flex: "1 1 calc(50% - 5px)",
        minWidth: 130,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 15 }}>{agent.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: agent.color, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {agent.name}
          </div>
          <div style={{ color: "#374151", fontSize: 9 }}>{agent.tag}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          {isRunning && <span style={{ width: 6, height: 6, borderRadius: "50%", background: agent.color, display: "inline-block", animation: "blink 0.8s infinite" }} />}
          <span style={{ fontSize: 9, color: isRunning ? agent.color : isDone ? "#4b5563" : "#1f2937" }}>
            {isRunning ? "実行中" : isDone ? "完了✅" : "待機"}
          </span>
        </div>
      </div>
      {isDone && !isSelected && (
        <div style={{ color: "#374151", fontSize: 9, marginTop: 4 }}>タップして結果を見る →</div>
      )}
    </div>
  );
}

export default function UchitoreMultiAgent() {
  const [task, setTask] = useState("");
  const [agentStates, setAgentStates] = useState(
    Object.fromEntries(AGENTS.map((a) => [a.id, { status: "idle", result: null }]))
  );
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(null);
  const [selected, setSelected] = useState(null);
  const [doneCount, setDoneCount] = useState(0);
  const [selectedAgents, setSelectedAgents] = useState(AGENTS.map((a) => a.id));

  const updateAgent = (id, update) =>
    setAgentStates((prev) => ({ ...prev, [id]: { ...prev[id], ...update } }));

  const toggleAgent = (id) => {
    if (running) return;
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const runAll = async () => {
    if (!task.trim() || running || selectedAgents.length === 0) return;
    setRunning(true);
    setElapsed(null);
    setSelected(null);
    setDoneCount(0);
    const start = Date.now();
    const targets = AGENTS.filter((a) => selectedAgents.includes(a.id));
    targets.forEach((a) => updateAgent(a.id, { status: "running", result: null }));
    AGENTS.filter((a) => !selectedAgents.includes(a.id)).forEach((a) =>
      updateAgent(a.id, { status: "idle", result: null })
    );
    const timer = setInterval(() => setElapsed(((Date.now() - start) / 1000).toFixed(1)), 100);
    let count = 0;
    await Promise.all(
      targets.map(async (agent) => {
        try {
          const result = await callAgent(agent, task);
          updateAgent(agent.id, { status: "done", result });
        } catch {
          updateAgent(agent.id, { status: "error", result: "エラーが発生しました" });
        }
        count++;
        setDoneCount(count);
      })
    );
    clearInterval(timer);
    setElapsed(((Date.now() - start) / 1000).toFixed(1));
    setRunning(false);
  };

  const reset = () => {
    setTask(""); setElapsed(null); setSelected(null); setDoneCount(0);
    AGENTS.forEach((a) => updateAgent(a.id, { status: "idle", result: null }));
  };

  const examples = [
    "一次関数の問題生成ロジックを実装したい",
    "アルファベットの手書き練習ページを作りたい",
    "英語・韓国語・中国語のi18n対応をしたい",
    "二次関数のグラフ描画を実装したい",
    "インスタとXで英語学習機能を訴求したい",
    "中学数学のテストモードを設計したい",
  ];

  const selectedAgent = selected ? AGENTS.find((a) => a.id === selected) : null;
  const selectedResult = selected ? agentStates[selected]?.result : null;
  const totalSelected = selectedAgents.length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #020a18 0%, #070e1a 60%, #030810 100%)",
      fontFamily: "'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif",
      color: "#e2e8f0",
      padding: "20px 13px",
      maxWidth: 700,
      margin: "0 auto",
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.15} }
        textarea:focus { outline: none; }
        button:active { transform: scale(0.97); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: "#f59e0b", letterSpacing: 3, marginBottom: 3 }}>UCHITORE — MULTI AGENT v2</div>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>🧮 うちトレ 8-Agent 開発ツール</h1>
        <p style={{ color: "#374151", fontSize: 10, marginTop: 4 }}>使いたいAgentを選んで同時実行</p>
      </div>

      {/* Agent セレクター */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#4b5563", marginBottom: 6 }}>
          実行するAgentを選択（{totalSelected}/{AGENTS.length}）
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {AGENTS.map((a) => {
            const on = selectedAgents.includes(a.id);
            return (
              <button key={a.id} onClick={() => toggleAgent(a.id)} style={{
                background: on ? `${a.color}20` : "#060d18",
                border: `1.5px solid ${on ? a.color : "#1a2a3f"}`,
                borderRadius: 20, padding: "3px 9px",
                color: on ? a.color : "#374151",
                fontSize: 10, fontWeight: on ? 700 : 400, cursor: "pointer", transition: "all 0.2s",
              }}>
                {a.icon} {a.name.replace(" Agent", "")}
              </button>
            );
          })}
        </div>
      </div>

      {/* 入力 */}
      <div style={{ background: "#09121f", border: "1.5px solid #152030", borderRadius: 12, padding: 13, marginBottom: 10 }}>
        <label style={{ fontSize: 10, color: "#4b5563", display: "block", marginBottom: 5 }}>
          やりたいこと・作りたい機能を入力
        </label>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="例: アルファベットの手書き練習ページを作りたい"
          rows={3}
          style={{
            width: "100%", background: "#020c1b", border: "1px solid #152030",
            borderRadius: 8, padding: "8px 10px", color: "#e2e8f0",
            fontSize: 13, resize: "vertical", boxSizing: "border-box", lineHeight: 1.6,
          }}
        />
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {examples.map((ex, i) => (
            <button key={i} onClick={() => setTask(ex)} style={{
              background: "#060d18", border: "1px solid #152030", borderRadius: 20,
              padding: "2px 7px", color: "#374151", fontSize: 9, cursor: "pointer",
            }}>
              {ex.length > 16 ? ex.slice(0, 16) + "…" : ex}
            </button>
          ))}
        </div>
      </div>

      {/* 実行ボタン */}
      <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
        <button onClick={runAll} disabled={running || !task.trim() || totalSelected === 0}
          style={{
            flex: 1, padding: "11px 0",
            background: running || !task.trim() || totalSelected === 0
              ? "#111827" : "linear-gradient(135deg, #6366f1, #a855f7)",
            border: "none", borderRadius: 10,
            color: running || !task.trim() || totalSelected === 0 ? "#374151" : "#fff",
            fontSize: 13, fontWeight: 700,
            cursor: running || !task.trim() || totalSelected === 0 ? "not-allowed" : "pointer",
          }}>
          {running
            ? `⚡ 実行中 ${doneCount}/${totalSelected} 完了... ${elapsed}s`
            : `⚡ ${totalSelected} Agents 同時実行`}
        </button>
        <button onClick={reset} style={{
          padding: "11px 12px", background: "#09121f",
          border: "1.5px solid #152030", borderRadius: 10, color: "#374151", fontSize: 11, cursor: "pointer",
        }}>リセット</button>
      </div>

      {!running && elapsed && doneCount === totalSelected && (
        <div style={{ textAlign: "center", marginBottom: 10, color: "#10b981", fontSize: 11 }}>
          ✅ {totalSelected} Agents 完了 — {elapsed}秒で並列処理
        </div>
      )}

      {/* Agent カード */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {AGENTS.filter((a) => selectedAgents.includes(a.id)).map((agent) => (
          <AgentCard
            key={agent.id} agent={agent}
            status={agentStates[agent.id].status}
            result={agentStates[agent.id].result}
            isSelected={selected === agent.id}
            onClick={() => setSelected(selected === agent.id ? null : agent.id)}
          />
        ))}
      </div>

      {/* 結果表示 */}
      {selectedAgent && selectedResult && (
        <div style={{
          background: "#09121f", border: `2px solid ${selectedAgent.color}70`,
          borderRadius: 12, padding: 13,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
            <span style={{ fontSize: 15 }}>{selectedAgent.icon}</span>
            <span style={{ color: selectedAgent.color, fontWeight: 700, fontSize: 12 }}>
              {selectedAgent.name} の回答
            </span>
            <button onClick={() => setSelected(null)} style={{
              marginLeft: "auto", background: "none", border: "none", color: "#374151", fontSize: 16, cursor: "pointer",
            }}>×</button>
          </div>
          <div style={{
            color: "#cbd5e1", fontSize: 12, lineHeight: 1.75,
            whiteSpace: "pre-wrap", maxHeight: 350, overflowY: "auto",
          }}>
            {selectedResult}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 16, color: "#111827", fontSize: 9 }}>
        うちトレ Multi-Agent v2 · 8 Agents Parallel
      </div>
    </div>
  );
}
