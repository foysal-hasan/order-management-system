import { Injectable } from '@nestjs/common';
import appConfig from './config/app.config';

@Injectable()
export class AppService {
   getHello(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>API Server Running</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0f172a;
            color: #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: #020617;
            border-radius: 12px;
            padding: 32px 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            max-width: 420px;
            text-align: center;
          }
          h1 {
            margin: 0 0 12px;
            font-size: 22px;
            color: #38bdf8;
          }
          p {
            margin: 0;
            font-size: 14px;
            opacity: 0.85;
          }
          code {
            display: block;
            margin-top: 16px;
            background: #020617;
            padding: 10px;
            border-radius: 6px;
            color: #a5f3fc;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>API is Running</h1>
          <p>Your backend service is up and responding.</p>
          <a href="${appConfig().app.url}/api" target="_blank"><code>Base URL: ${appConfig().app.url}/api</code></a>
          <a href="${appConfig().app.url}/api/docs" target="_blank"><code>Docs: ${appConfig().app.url}/api/docs</code></a>
        </div>
      </body>
    </html>
  `;
  }
}
