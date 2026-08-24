# Content Shelf Application

A full-stack mobile application with NestJS backend and React Native/Expo frontend, featuring Google OAuth authentication.

## Features

- 🔐 **Authentication**: Email/password and Google OAuth sign-in
- 📱 **Mobile-First**: Built with React Native and Expo
- 🚀 **Modern Backend**: NestJS with TypeORM and PostgreSQL
- 🎨 **Beautiful UI**: Smooth animations and professional design
- 🔒 **Secure**: JWT tokens, HTTP-only cookies, server-side verification

## Quick Start

### Google OAuth Setup

Choose the setup guide that matches your deployment:

📱 **[Mobile-Only Setup (IP Address/No Domain)](./MOBILE_OAUTH_SETUP.md)** - For mobile apps with backend on IP address

📖 **[Quick Start Guide](./GOOGLE_OAUTH_QUICKSTART.md)** - General setup guide

📚 **[Complete Documentation](./docs/GOOGLE_OAUTH_SETUP.md)** - Full technical documentation

## Project Structure

```
├── server/          # NestJS backend
├── mobile/          # React Native/Expo mobile app
├── docs/            # Documentation
└── infra/           # Infrastructure configs
```

## Get Started

### Backend Setup

1. Install dependencies
   ```bash
   cd server
   npm install
   ```

2. Configure environment
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Run database migrations
   ```bash
   npm run migration:run
   ```

4. Start the server
   ```bash
   npm run start:dev
   ```

### Mobile Setup

1. Install dependencies
   ```bash
   cd mobile
   npm install
   ```

2. Configure environment
   ```bash
   cp .env.example .env
   # Edit .env with your API URL and Google OAuth credentials
   ```

3. Start the app
   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD.

## Workflows

### `deploy.yml`

Automated build and deployment workflow for Google Cloud Platform (GCE).

**Features:**
- Builds Docker images for the server
- Pushes images to Google Artifact Registry
- Deploys to GCE e2-micro instance
- Automated SSH key management
- Health checks and verification

**Triggers:**
- Push to `main` or `master` branch
- Manual trigger via GitHub Actions UI

**Required Secrets:**
See [GITHUB_ACTIONS_DEPLOYMENT.md](../docs/GITHUB_ACTIONS_DEPLOYMENT.md) for complete setup instructions.

## Quick Start

1. Set up Google Cloud resources (see deployment docs)
2. Configure GitHub Secrets
3. Push to main branch or trigger manually
4. Monitor deployment in Actions tab

## Workflow Status

Check workflow status badges in your README:
```markdown
![Deploy](https://github.com/USERNAME/REPO/workflows/Build%20and%20Deploy%20to%20GCE/badge.svg)
```

