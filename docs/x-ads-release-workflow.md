# X Ads Release Workflow

## User connection flow

Normal users connect X Ads through the **Connect with X** button. AdFlow starts a
three-legged OAuth 1.0a authorization, stores the temporary request-token secret
encrypted for at most ten minutes, and exchanges it for the user's access token
after X redirects back.

Users do not need to find, copy, or share access tokens. Manual token entry remains
available only under the advanced connection section for development and recovery.

Configure the X Developer Console callback URL to match:

```text
https://adflow-ai-api.fly.dev/integrations/x-ads/oauth/callback
```

Production backend environment:

```env
X_ADS_OAUTH_CALLBACK_URL=https://adflow-ai-api.fly.dev/integrations/x-ads/oauth/callback
ADFLOW_FRONTEND_APP_URL=https://adflow-ai-wine.vercel.app
```

OAuth callback sessions are single-use and expire after ten minutes. Denied,
expired, reused, and failed exchanges are returned to the application as explicit
connection states.

AdFlow AI uses the existing Pair Analysis, AI review, `apply_ready`, A/B test, and Outcome Learning features to operate an approval-gated X Ads improvement workflow.

## Release Flow

1. Connect an approved X Ads application with OAuth 1.0a user access token credentials.
2. Sync an X Ads account to import promoted posts and daily metrics.
3. Pair the imported ad with an existing landing page and run Pair Analysis.
4. Review AI proposals and mark one proposal as `apply_ready`.
5. Create an inert X Ads publishing draft from the approved proposal.
6. Review the final text, destination URL, target account, and line item.
7. Explicitly approve the draft.
8. Explicitly publish the approved draft.
9. AdFlow creates a promoted-only post, attaches it to the selected line item, registers the new ad, starts an A/B test, and creates an Outcome draft.
10. Future metric syncs update the registered ad and measured Outcome.

No proposal is published merely because it is marked `apply_ready`.

## Required Backend Environment

```env
X_ADS_CONSUMER_KEY=
X_ADS_CONSUMER_SECRET=
X_ADS_TOKEN_ENCRYPTION_KEY=
X_ADS_API_BASE_URL=https://ads-api.x.com/12
```

Generate `X_ADS_TOKEN_ENCRYPTION_KEY` once and keep it stable:

```powershell
py -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Changing the encryption key makes stored X Ads user tokens unreadable.

## Required X Permissions

- Approved X Ads API access
- Campaign Management and Creative read/write access
- Access to the target Ads account
- `TWEET_COMPOSER` permission for a promotable user

The service refuses publishing when the account has no promotable users.

## Safety Controls

- OAuth tokens are encrypted before storage.
- Draft creation requires an `apply_ready` AI result.
- Approval and publishing are separate authenticated actions.
- Publishing uses an idempotency key and persists remote-operation checkpoints.
- Published requests cannot be published a second time.
- Detailed account sync is limited to once every five minutes.
- Every remote publish step is written to `x_ads_publish_events`.
- Successful publishing is also written to `change_history`.

## Database Migration

Apply:

```text
supabase/migrations/202606070002_x_ads_release_workflow.sql
```

The migration adds X identifiers to `twitter_ads` and creates connection, account, metric snapshot, publish request, and publish event tables.

## Operational Note

Use a test Ads account and low-budget line item for the first production verification. X Ads API access and endpoint behavior depend on the permissions granted to the application and Ads account.
