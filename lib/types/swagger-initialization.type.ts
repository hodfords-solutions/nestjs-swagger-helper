import { NestExpressApplication } from '@nestjs/platform-express';
import { SecuritySchemeObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export type SwaggerInitialization = {
    app: NestExpressApplication;
    appEnv: string;
    title: string;
    description: string;
    version: string;
    appPrefix?: string;
    disablePrivateDocument?: boolean;
    addBearerAuth?: boolean;
    securityRequirements?: { name: string; requirements?: string[] }[];
    securities?: { name: string; options: SecuritySchemeObject }[];
};
