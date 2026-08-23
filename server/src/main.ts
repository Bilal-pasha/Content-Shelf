import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  ValidationError,
  BadRequestException,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig } from './config/swagger.config';
import {
  CORS_CONFIG,
  VALIDATION_CONFIG,
  DEFAULT_PORT,
} from './common/constants/app.constants';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import * as fs from 'fs';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Get the logger service
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Get the port from the environment variables
  const configService = app.get(ConfigService);
  const port = configService.get<number>('SERVER_PORT', DEFAULT_PORT);

  // Setup Swagger
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  // Configure static file serving
  // const publicPath = path.join(__dirname, '..', 'public');
  // app.useStaticAssets(publicPath);
  // logger.log(`Serving static files from: ${publicPath}`, 'Bootstrap');

  // Create audio files directory
  const audioFilesPath = path.join(process.cwd(), 'audio', 'files');
  if (!fs.existsSync(audioFilesPath)) {
    fs.mkdirSync(audioFilesPath, { recursive: true });
    logger.log(
      `Created audio files directory at: ${audioFilesPath}`,
      'Bootstrap',
    );
  }

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: VALIDATION_CONFIG.WHITELIST,
      forbidNonWhitelisted: VALIDATION_CONFIG.FORBID_NON_WHITELISTED,
      transform: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const errors = validationErrors.map((error) => ({
          property: error.property,
          constraints: error.constraints
            ? Object.values(error.constraints)
            : [],
        }));

        return new BadRequestException({
          message: 'Validation failed',
          errors,
        });
      },
    }),
  );

  app.use(cookieParser());
  app.use(helmet());

  app.enableCors({
    origin: CORS_CONFIG.ORIGIN,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: CORS_CONFIG.CREDENTIALS,
  });

  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  logger.log(
    `Application is running on: ${process.env.ASSETS_URL || `http://localhost:${port}`}`,
    'Bootstrap',
  );
  logger.log(
    `Swagger documentation is available at: ${process.env.ASSETS_URL || `http://localhost:${port}`}/api`,
    'Bootstrap',
  );
}

void bootstrap();
