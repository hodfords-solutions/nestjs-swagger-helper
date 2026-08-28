import { NestExpressApplication } from '@nestjs/platform-express';
import { SecuritySchemeObject } from '@nestjs/swagger';
import { ApiReferenceOptions } from '@scalar/nestjs-api-reference';

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
    mergeSecurityGroups?: string[][];
    scalarConfig?: Omit<ApiReferenceOptions, 'spec'>;
};
