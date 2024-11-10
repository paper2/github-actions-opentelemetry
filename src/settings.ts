export const settings = {
  workflowRunId: process.env.WORKFLOW_RUN_ID
    ? parseInt(process.env.WORKFLOW_RUN_ID)
    : undefined,
  owner: process.env.OWNER,
  repository: process.env.REPOSITORY,
  FeatureFlagTrace: process.env.FEATURE_TRACE
    ? process.env.FEATURE_TRACE.toLowerCase() === 'true'
    : false,
  // Always set to true when GitHub Actions is running the workflow.
  isGitHubActions: process.env.GITHUB_ACTIONS === 'true'
}
// TODO: nodesdk利用していないので、dialogでデバックログ出せるように戻す
// TODO: ACTIONS_RUNNER_DEBUGとACTIONS_STEP_DEBUGがTrueの時にdebug有効化するのも良いかも
// https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/troubleshooting-workflows/enabling-debug-logging

export default settings
