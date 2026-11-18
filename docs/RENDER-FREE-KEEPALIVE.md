# Render Free API keepalive

The public GitHub Actions workflow `.github/workflows/render-free-keepalive.yml` makes a small GET request to the deployed Render API root every 10 minutes (at minutes 7, 17, 27, 37, 47 and 57 UTC). The root route returns a lightweight liveness response without querying the database. The workflow needs no secrets or repository contents permissions.

When Render is waking from sleep, the request retries for up to about 95 seconds. A cold start may make that run appear slow or fail if Render takes longer. The next scheduled request tries again.

## Limits and cost

- The repository is public, so standard GitHub-hosted runner time is free under GitHub Actions billing. This would be billed differently for a private repository.
- Render may delay or restart a Free instance. GitHub says scheduled workflows can also be delayed or dropped during high load. This is a best-effort keepalive, not an uptime guarantee.
- A healthy ten-minute schedule keeps one Render service running for about 720 hours per month, close to Render's shared 750 Free instance-hour allowance. Monitor the Render workspace usage page for other Free services using those hours.
- GitHub automatically disables scheduled workflows in public repositories after 60 days without repository activity. Check the Actions page occasionally.

## Verify or disable

After this workflow is merged to the default branch, open the repository Actions page and check **Render Free API keepalive**. Use **Run workflow** for one manual wake request. To stop periodic requests, disable this workflow in GitHub Actions or remove the workflow file.

The current Render host is recorded in `docs/HOSTED-DEMO-RECOVERY.md`. If it changes, update `GYMOS_RENDER_URL` in the workflow and verify the response before merging. The root route is liveness only; it does not prove database or scheduled-worker health.
