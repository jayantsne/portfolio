# GitHub Deployment Setup

This repo now has GitHub Actions for:

- `CI`: builds the Angular app and .NET API on pull requests and pushes to `main`.
- `Deploy Frontend`: builds `angular-starter` and deploys it to the VPS.
- `Deploy API`: publishes `enterprise-dotnet-api`, writes runtime secrets to `/etc/ailearnapi.env`, installs the systemd service, and restarts it.

## Required GitHub Secrets

Add these in GitHub: `Settings` -> `Secrets and variables` -> `Actions` -> `Secrets`.

| Secret | Purpose |
| --- | --- |
| `VPS_HOST` | VPS IP or host, for example `76.13.244.113`. |
| `VPS_USER` | SSH user used by GitHub Actions, for example `root` or a restricted deploy user. |
| `VPS_SSH_PRIVATE_KEY` | Private SSH key for the deploy user. Do not commit this key. |
| `MONGODB_CONNECTION_STRING` | Full MongoDB URI for the app user. |
| `API_KEY` | API key used by the backend. |
| `JWT_SECRET_KEY` | Strong JWT signing key, at least 32 characters. |

Optional secrets:

| Secret | Default |
| --- | --- |
| `REDIS_CONNECTION_STRING` | `localhost:6379` |
| `MONGODB_DATABASE` | `jayant-portfolio` |
| `LLM_PROVIDER_ENCRYPTION_KEY` | Empty |
| `OPENAI_API_KEY` | Empty |
| `RAZORPAY_KEY_ID` | Empty |
| `RAZORPAY_KEY_SECRET` | Empty |

## Optional GitHub Variables

Add these in GitHub: `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`.

| Variable | Default |
| --- | --- |
| `FRONTEND_DEPLOY_PATH` | `/var/www/learnwithai.tech/frontend` |
| `BACKEND_DEPLOY_PATH` | `/var/www/learnwithai.tech/backend` |
| `API_SERVICE_NAME` | `ailearnapi` |
| `JWT_ISSUER` | `AILearnAPI` |
| `JWT_AUDIENCE` | `AILearnAPI` |

## SSH Key Setup

Create a deploy key on your local machine or on the VPS:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f github_actions_deploy -N ""
```

Add the public key to the deploy user's `~/.ssh/authorized_keys` on the VPS:

```bash
cat github_actions_deploy.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

Add the private key file content from `github_actions_deploy` to the GitHub secret `VPS_SSH_PRIVATE_KEY`.

## Push and Deploy

Commit the changes and push to `main`. GitHub Actions will run automatically:

```bash
git add .
git commit -m "Add CI and deployment workflows"
git push origin main
```

Note: this local repo currently points to `https://github.com/jayantbhardwaj199/jayant-angular-ui.git`. If the deployment repo should be under `https://github.com/jayantsne`, update the remote before pushing.
