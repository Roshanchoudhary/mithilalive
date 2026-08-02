import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log(`${YELLOW}🚀 Starting deployment...${RESET}\n`);

// Check environment variables
console.log('📋 Checking environment variables...');
const requiredEnv = ['JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missing = requiredEnv.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.log(`${RED}❌ Missing environment variables: ${missing.join(', ')}${RESET}`);
  console.log('💡 Please set them in your .env file or Cloudflare dashboard');
  process.exit(1);
}

console.log(`${GREEN}✅ Environment variables OK${RESET}\n`);

// Build the project
console.log('🔨 Building project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log(`${GREEN}✅ Build completed${RESET}\n`);
} catch (error) {
  console.log(`${RED}❌ Build failed${RESET}`);
  process.exit(1);
}

// Run database migrations
console.log('📊 Running database migrations...');
try {
  execSync('npm run db:migrate', { stdio: 'inherit' });
  console.log(`${GREEN}✅ Migrations completed${RESET}\n`);
} catch (error) {
  console.log(`${RED}❌ Migrations failed${RESET}`);
  console.log('💡 You can run migrations manually: npm run db:migrate');
}

// Deploy to Cloudflare Pages
console.log('☁️ Deploying to Cloudflare Pages...');
try {
  execSync('npm run cf-build', { stdio: 'inherit' });
  console.log(`${GREEN}✅ Deployment completed${RESET}\n`);
} catch (error) {
  console.log(`${RED}❌ Deployment failed${RESET}`);
  console.log('💡 You can deploy manually: npm run cf-build');
  process.exit(1);
}

console.log(`
${GREEN}🎉 Deployment successful!${RESET}

Your News Portal CMS is now live!

🔑 Admin Login:
   URL: https://your-domain.com/admin/login
   Email: ${process.env.ADMIN_EMAIL || 'admin@example.com'}
   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}

📝 Next Steps:
   1. Visit your admin panel to customize settings
   2. Create categories and tags
   3. Start publishing news articles
   4. Configure advertisements
   5. Customize theme and menus

📚 Documentation: README.md
`);
