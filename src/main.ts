import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Storage } from './common/lib/Disk/Storage';
import appConfig from './config/app.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as path from 'path';
import { ValidationPipe } from '@nestjs/common';
import { CustomExceptionFilter } from './common/exception/custom-exception.filter';
import { PrismaExceptionFilter } from './common/exception/prisma-exception-filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: appConfig().app.environment === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

app.getHttpAdapter().getInstance().set('trust proxy', true);

app.setGlobalPrefix('api', {
    exclude: ['/', '/health', '/stripe/onboarding/refresh', '/stripe/onboarding/return'],
  });

   // Get origins from config service
  const corsOrigins = appConfig().app.cross_origins?.split(',') || [];
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      console.log(`Incoming request from origin: ${origin}`);

      // Allow if origin is in the allowed list
      if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked: ${origin}`);
        console.warn(`Allowed origins: ${corsOrigins.join(', ')}`);
        callback(new Error(`CORS policy: ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.use(helmet());


    // static assets
  app.useStaticAssets(path.join(process.cwd(), 'public'), {
    index: false,
    prefix: '/public',
  });

  app.useStaticAssets(path.join(process.cwd(), 'public/storage'), {
    index: false,
    prefix: '/storage',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  app.useGlobalFilters(new CustomExceptionFilter(), new PrismaExceptionFilter());

    Storage.config({
    driver: appConfig().fileSystems.driver,
    connection: {
      rootUrl: appConfig().storageUrl.rootUrl,
      publicUrl: appConfig().storageUrl.rootUrlPublic,
      // aws s3
      awsBucket: appConfig().fileSystems.s3.bucket,
      awsAccessKeyId: appConfig().fileSystems.s3.key,
      awsSecretAccessKey: appConfig().fileSystems.s3.secret,
      awsDefaultRegion: appConfig().fileSystems.s3.region,
      awsEndpoint: appConfig().fileSystems.s3.endpoint,
      minio: true,
      // google cloud storage
      gcpProjectId: appConfig().fileSystems.gcs.projectId,
      gcpKeyFile: appConfig().fileSystems.gcs.keyFile,
      gcpApiEndpoint: appConfig().fileSystems.gcs.apiEndpoint,
      gcpBucket: appConfig().fileSystems.gcs.bucket,
    },
  });


    // swagger
  const options = new DocumentBuilder()
    .setTitle(`${appConfig().app.name} API`)
    .setDescription(`${appConfig().app.name} api docs`)
    .setVersion('1.0')
    .addTag(`${appConfig().app.name}`)
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, options, {
    ignoreGlobalPrefix: false,
  });

  SwaggerModule.setup('api/docs', app, document);
  // end swagger
  
  await app.listen(appConfig().app.port ?? 4000);
}
bootstrap();
