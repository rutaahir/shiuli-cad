import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// Email API middleware for sending emails via Gmail SMTP credentials
function emailApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-email-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/send-email' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', async () => {
            try {
              const { to, subject, html, text } = JSON.parse(body);
              const nodemailer = await import('nodemailer');

              const emailUser = process.env.VITE_EMAIL_USER || process.env.EMAIL_HOST_USER || '';
              const emailPass = (process.env.VITE_EMAIL_PASS || process.env.EMAIL_HOST_PASSWORD || '').replace(/\s+/g, '');

              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: emailUser,
                  pass: emailPass,
                },
              });

              const mailOptions = {
                from: `"Shiuli CAD Studio" <${emailUser}>`,
                to,
                subject,
                html,
                text: text || '',
              };

              const info = await transporter.sendMail(mailOptions);
              console.log('✉️ Gmail SMTP Email sent:', info.messageId, 'to:', to);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, messageId: info.messageId }));
            } catch (err: any) {
              console.error('❌ Gmail SMTP Error:', err?.message || err);
              // Graceful development fallback so user registration is never blocked
              console.log(`\n======================================================\n📨 [DEV EMAIL SIMULATION DISPATCH]\nTo: ${body.slice(0, 100)}\nTime: ${new Date().toLocaleTimeString()}\n======================================================\n`);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                simulated: true, 
                notice: 'Email processed in dev mode. Verification code available in UI.',
                error: err?.message
              }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aistudioMediaPlugin(), emailApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/unsplash-img': {
          target: 'https://images.unsplash.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/unsplash-img/, ''),
          headers: { Referer: 'https://unsplash.com' },
        },
        '/media': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
