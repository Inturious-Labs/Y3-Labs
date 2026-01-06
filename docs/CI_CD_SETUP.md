# CI/CD Setup for Internet Computer Deployment

This guide will help you set up automatic deployment of your Pacboy 2025 game to the Internet Computer using GitHub Actions.

## 🚀 Quick Start

### Option 1: Simple Deployment (Recommended for testing)

1. **Use the simple workflow**: The `.github/workflows/deploy-simple.yml` file is ready to use
2. **Push to main branch**: Any push to `main` or `master` will trigger deployment
3. **Monitor deployment**: Check the Actions tab in your GitHub repository

### Option 2: Authenticated Deployment (For production)

1. **Set up authentication** (see Authentication Setup below)
2. **Use the full workflow**: `.github/workflows/deploy.yml`
3. **Configure secrets** in GitHub repository settings

## 📋 Prerequisites

- GitHub repository with your code
- Internet Computer canister already created
- DFX installed locally (for testing)

## 🔧 Authentication Setup

### For Production Deployment

1. **Generate an identity PEM file**:
   ```bash
   dfx identity new github-actions
   dfx identity export github-actions > github-actions.pem
   ```

2. **Add the PEM content to GitHub Secrets**:
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Create a new secret named `INTERNET_COMPUTER_IDENTITY_PEM`
   - Paste the content of `github-actions.pem` as the value

3. **Use the authenticated workflow**: `.github/workflows/deploy.yml`

## 📁 Workflow Files

### Simple Deployment (`.github/workflows/deploy-simple.yml`)
- ✅ No authentication required
- ✅ Works immediately
- ⚠️ Limited permissions
- 🔧 Good for testing

### Full Deployment (`.github/workflows/deploy.yml`)
- ✅ Full authentication support
- ✅ Pull request comments
- ✅ Better error handling
- 🔧 Requires setup

## 🎯 How It Works

1. **Trigger**: Push to `main` or `master` branch
2. **Environment**: Ubuntu runner with Node.js 18
3. **DFX Installation**: Automatic installation of latest DFX
4. **Identity Setup**: Creates or uses deployment identity
5. **Deployment**: Deploys to Internet Computer network
6. **Artifacts**: Saves deployment information

## 🔍 Monitoring

### Check Deployment Status
1. Go to your GitHub repository
2. Click on the "Actions" tab
3. View the latest workflow run
4. Check the logs for any errors

### Deployment Information
- Canister ID: `viiha-gqaaa-aaaae-qfe4q-cai`
- Live URL: https://viiha-gqaaa-aaaae-qfe4q-cai.ic0.app
- Network: Internet Computer (IC)

## 🛠️ Troubleshooting

### Common Issues

1. **"No identity PEM provided"**
   - Solution: Use the simple workflow or set up authentication

2. **"Deployment failed"**
   - Check: DFX version compatibility
   - Check: Canister permissions
   - Check: Network connectivity

3. **"Identity not found"**
   - Solution: The workflow creates a new identity automatically

### Debug Steps

1. **Check workflow logs** in GitHub Actions
2. **Test locally first**:
   ```bash
   dfx deploy --network ic
   ```
3. **Verify canister exists**:
   ```bash
   dfx canister --network ic info y3-labs
   ```

## 🔒 Security Considerations

### For Production
- Use authenticated deployment
- Store PEM files securely in GitHub Secrets
- Limit access to deployment keys
- Monitor deployment logs

### For Development
- Simple deployment is sufficient
- No sensitive data required
- Easy to set up and test

## 📈 Advanced Features

### Pull Request Integration
- Automatic deployment on PR creation
- Status comments on PRs
- Deployment artifacts available

### Environment Variables
- `DFX_NETWORK: ic` - Deploy to Internet Computer
- `INTERNET_IDENTITY_URL` - Identity service URL
- `II_DERIVATION_ORIGIN` - Your canister URL

## 🎮 Testing Your Deployment

1. **Push a small change** to trigger deployment
2. **Wait for completion** (usually 2-3 minutes)
3. **Visit your canister URL** to verify changes
4. **Check the Actions tab** for deployment logs

## 📝 Next Steps

1. **Choose your workflow** (simple or authenticated)
2. **Push to main branch** to trigger first deployment
3. **Monitor the deployment** in GitHub Actions
4. **Verify your changes** are live on the Internet Computer

## 🆘 Support

If you encounter issues:
1. Check the workflow logs in GitHub Actions
2. Verify your `dfx.json` configuration
3. Test deployment locally first
4. Check Internet Computer network status

---

**Happy deploying! 🚀** 