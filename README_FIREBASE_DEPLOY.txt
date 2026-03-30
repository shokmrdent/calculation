昌太郎式計算問題作成サイト / Firebase Hosting 配置メモ

このZIPは、Firebase Hosting にそのまま載せやすい構成に調整済みです。

構成:
- public/               サイト本体
- firebase.json         Hosting 設定
- .firebaserc           既定プロジェクト設定 (calculations-11955)
- .gitignore            補助ファイル

公開手順:
1. このフォルダを VS Code で開く
2. ターミナルで以下を実行

   npm install -g firebase-tools
   firebase login
   firebase deploy

補足:
- public/index.html がトップページです。
- 各ページは .html つきURLのまま公開されます。
- 今回は静的サイトなので、Auth / Firestore は未使用です。
