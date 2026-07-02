import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Storage } from './common/lib/Disk/Storage';
import appConfig from './config/app.config';
import { DiskType } from './common/lib/Disk/Option';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: appConfig().app.environment === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
  });



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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
