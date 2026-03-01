# ToDoList - 階層型タスク管理アプリケーション

Docker コンテナ上で動作する、階層型 ToDoList Web アプリケーション。

## 機能

- **シングルタスク**: 個別のタスクを作成・管理
- **グループタスク**: 複数のタスクをまとめるグループ
  - 順位付き (RANKED): ドラッグ＆ドロップで並べ替え可能
  - 順位なし (UNRANKED): 任意の順序
  - ネスト対応: グループの中にグループを作成可能
- **期限の自動反映**: 子タスクの期限がグループに自動伝播
- **進捗表示**: グループのタスク完了率をプログレスバーで表示

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Backend | Django 5.1 + Django REST Framework |
| Frontend | React 18 + Vite |
| Database | PostgreSQL 16 |
| Container | Docker / Docker Compose |

## セットアップ

```bash
# クローンしてディレクトリに移動
cd todo-list

# コンテナをビルド＆起動
docker compose up --build

# アクセス
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/api/
# Django Admin: http://localhost:8000/admin/
```

## API エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/tasks/` | トップレベルタスク一覧 (子含む) |
| POST | `/api/tasks/` | タスク作成 |
| GET | `/api/tasks/{id}/` | タスク詳細 |
| PATCH | `/api/tasks/{id}/` | タスク更新 |
| DELETE | `/api/tasks/{id}/` | タスク削除 (子も連動) |
| POST | `/api/tasks/{id}/toggle/` | 完了状態の切り替え |
| POST | `/api/tasks/{id}/reorder/` | 子タスクの並び替え |
