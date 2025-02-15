# 骨子

- how to work

  - これはgetting startedじゃないな。別で書くか

- 概要
- required
  - google cloud project
  - apiの有効化までやる？
  - gcloud cli
- gcloud のデフォルトを設定する
  - https://cloud.google.com/run/docs/tutorials/custom-metrics-opentelemetry-sidecar?hl=ja#setting-up-gcloud
- github-actions-opentelemteryリポジトリをfork
- OpenTelemetry コレクターをCloud Runにデプロイする

  - NOTE: 検証以外では認証をつけることを推奨。

  ```sh
    gcloud run deploy collector \
    --project=<your-project-id> \
    --region=asia-northeast1 \
    --source . \
    --allow-unauthenticated \
    --port=4318 \
    --max-instances=3
  ```

  - https://github.com/paper2/github-actions-opentelemetry/commit/cf10e8cc4e8272965f427610d563fa201855de07
  - 構成ファイルの解説

- secrets.OTEL_EXPORTER_OTLP_ENDPOINT にcloud runのエンドポイントを設定
- empty commitをしてpush
  - example workflowとsend metricsが成功することを確認
- 確認が終わったらempty commitをしてpush(metricsの差分を見るため)
  - example workflowとsend metricsが動く
- トレースの確認
  - send metricsのトレースIDで検索
- empty commitをしてpush(metricsの差分を見るため)
  - example workflowとsend metricsが動く
- Metrics Exploerで確認
- clean up
  - cloud runの削除
  - デフォルト設定のunset
  - https://cloud.google.com/run/docs/tutorials/custom-metrics-opentelemetry-sidecar?hl=ja#review-code
