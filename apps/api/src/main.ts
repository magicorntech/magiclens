import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  app.useLogger(app.get(Logger))
  app.enableShutdownHooks()

  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((s) => s.trim())
  // Local Electron (file://) and Vite need permissive CORS; lock down via CORS_ORIGINS in production if desired.
  app.enableCors({
    origin: process.env.CORS_STRICT === 'true' ? origins : true,
    credentials: true
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  )

  const swagger = new DocumentBuilder()
    .setTitle('MagicLens API')
    .setDescription('Enterprise authentication, authorization, and cluster management API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger))

  const port = Number(process.env.API_PORT ?? 3000)
  await app.listen(port)
  console.log(`MagicLens API listening on :${port}`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
