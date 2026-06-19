# `/login`

> **履歴UI資料:** このページ文書は初期UI監査時点の記録です。現在の画面・接続状態は [`../adflow-ai-current-state.md`](../adflow-ai-current-state.md) を参照してください。


## 目的

Supabase Authを使ったログイン画面。Google OAuthで管理画面へ入る導線を提供する。

## 現在UIに表示される主な内容

- ブランド表示
  - AdFlow AI
  - Review-first ad ops
- Login card
  - Button: `Continue with Google`
- エラー時
  - `Google login failed.`

## 主なユーザー操作

- Continue with Google

## Empty State

- Supabase環境変数が未設定、またはOAuth設定が不足している場合はログイン失敗toastが出る可能性がある。

## スクリーンショット

未確認。
