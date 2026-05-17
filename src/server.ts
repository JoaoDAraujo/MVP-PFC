import 'dotenv/config';
import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import selfsigned from 'selfsigned';
import { applySecurityMiddlewares } from './middlewares/security';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

// ==========================================
// server.ts — responsabilidade única: inicializar o servidor
// Toda lógica de negócio, segurança e banco está em suas camadas próprias
// ==========================================

const app = express();
const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;

// Aplica middlewares de segurança (helmet, cors, session, static)
applySecurityMiddlewares(app);

// Registra as rotas (Controller é chamado dentro de cada rota)
app.use('/api', authRoutes);
app.use('/api', dashboardRoutes);

// Servidor secundário: redireciona HTTP → HTTPS obrigatoriamente
const httpRedirect = express();
httpRedirect.use((req, res) => {
  res.redirect(`https://${req.hostname}:${HTTPS_PORT}${req.originalUrl}`);
});

// Inicialização assíncrona com geração de certificado SSL local
async function startServer() {
  let sslOptions;
  try {
    if (fs.existsSync('key.pem') && fs.existsSync('cert.pem')) {
      sslOptions = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
      };
    } else {
      console.log('[HTTPS] Gerando certificados SSL autoassinados localmente...');
      const attrs = [{ name: 'commonName', value: 'localhost' }];
      const pems = await selfsigned.generate(attrs, { days: 365 } as any);
      fs.writeFileSync('key.pem', pems.private);
      fs.writeFileSync('cert.pem', pems.cert);
      sslOptions = { key: pems.private, cert: pems.cert };
    }

    https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
      console.log(`[HTTPS] API rodando de forma segura em: https://localhost:${HTTPS_PORT}`);
    });

    http.createServer(httpRedirect).listen(HTTP_PORT, () => {
      console.log(`[HTTP] Redirecionador ativo na porta ${HTTP_PORT} → ${HTTPS_PORT}`);
    });

  } catch (error) {
    console.error('Erro ao iniciar HTTPS. Verifique os certificados.', error);
  }
}

startServer();
