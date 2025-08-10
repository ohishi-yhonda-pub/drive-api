# Google Drive API - ファイルアップロードサービス

Hono で構築され、Cloudflare Workers にデプロイされる、Google Drive ファイル操作用の最新 TypeScript ベース API サービスです。

## 🌟 特徴

- **ファイルアップロード**: OAuth認証を使用したGoogle Driveへのファイルアップロード
- **フォルダ管理**: フォルダの作成、一覧表示、削除
- **OAuth統合**: セキュアなGoogle OAuth 2.0認証フロー
- **OpenAPI ドキュメント**: API探索用のインタラクティブSwagger UI
- **TypeScript**: コードベース全体での完全な型安全性
- **包括的テスト**: 100%カバレッジのユニット・統合テスト
- **Cloudflare Workers**: 最適なパフォーマンスのためのサーバーレスデプロイ

## 🚀 クイックスタート

### 前提条件

- Node.js 20+
- Cloudflareアカウント
- Drive API が有効化されたGoogle Cloud Platform アカウント

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/your-username/drive-api.git
cd drive-api

# 依存関係をインストール
npm install

# 環境変数を設定
cp .dev.vars.example .dev.vars
# .dev.vars を Google OAuth 認証情報で編集
```

### 開発

```bash
# 開発サーバーを開始
npm run dev

# テストを実行
npm test

# カバレッジ付きでテストを実行
npm run test:coverage

# UI付きでテストを実行
npm run test:ui
```

### デプロイ

```bash
# Cloudflare Workers にデプロイ
npm run deploy
```

## 📚 API ドキュメント

実行中に以下にアクセス：
- **API ドキュメント**: `http://localhost:8787/doc`
- **OpenAPI 仕様**: `http://localhost:8787/specification`

## 🔧 環境変数

以下の変数を含む `.dev.vars` ファイルを作成：

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_DRIVE_DEFAULT_FOLDER_ID=your-default-folder-id
GOOGLE_DRIVE_TEST_FOLDER_ID=your-test-folder-id
```

## 🛠️ 利用可能なスクリプト

| コマンド | 説明 |
|---------|-------------|
| `npm run dev` | 開発サーバーを開始 |
| `npm run deploy` | Cloudflare Workers にデプロイ |
| `npm test` | テストをウォッチモードで実行 |
| `npm run test:run` | テストを一度実行 |
| `npm run test:coverage` | カバレッジレポート付きでテストを実行 |
| `npm run test:ui` | UI インターフェースでテストを実行 |
| `npm run test:unit` | ユニットテストのみ実行 |
| `npm run test:integration` | 統合テストのみ実行 |

## 📁 プロジェクト構造

```
src/
├── api/drive/          # Drive API エンドポイント
│   ├── auth.ts         # OAuth認証
│   ├── callback.ts     # OAuthコールバックハンドラ
│   ├── upload.ts       # ファイルアップロードエンドポイント
│   └── folder/         # フォルダ操作
├── utils/              # ユーティリティ関数
│   ├── googleDrive.ts  # Google Drive API クライアント
│   └── oauth.ts        # OAuth ユーティリティ
└── schema/             # Zod バリデーションスキーマ

test/
├── unit/              # ユニットテスト
├── integration/       # 統合テスト
└── utils/            # テストユーティリティ
```

## 🧪 テスト

プロジェクトは包括的なユニット・統合テストで100%テストカバレッジを維持：

- **ユニットテスト**: 個別の関数とコンポーネントをテスト
- **統合テスト**: API エンドポイントをエンドツーエンドでテスト
- **カバレッジレポート**: Istanbul で生成し、GitHub Pages にデプロイ

### 📊 テストカバレッジレポート

最新のテストカバレッジレポートは以下で確認できます：
**[https://ohishi-yhonda-pub.github.io/drive-api/](https://ohishi-yhonda-pub.github.io/drive-api/)**

## 🔐 セキュリティ

- Google との OAuth 2.0 認証
- 環境変数による設定
- Zod スキーマによる入力検証
- セキュアなトークン処理と更新

## 🤝 貢献

1. リポジトリをフォーク
2. 機能ブランチを作成
3. 変更を実装
4. 新機能のテストを追加
5. 全テストが通過することを確認
6. プルリクエストを提出

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています。

## 🔗 リンク

- [Google Drive API ドキュメント](https://developers.google.com/drive/api)
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Hono ドキュメント](https://hono.dev/)