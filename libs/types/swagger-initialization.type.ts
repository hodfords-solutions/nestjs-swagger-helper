import { NestExpressApplication } from '@nestjs/platform-express';

export type SwaggerInitialization = {
    app: NestExpressApplication;
    appEnv: string;
    title: string;
    description: string;
    version: string;
    appPrefix?: string;
};
