import { NestExpressApplication } from '@nestjs/platform-express';
import {SecuritySchemeObject} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

export type SwaggerInitialization = {
    app: NestExpressApplication;
    appEnv: string;
    title: string;
    description: string;
    version: string;
    appPrefix?: string;
    disablePrivateDocument?: boolean;
    addBearerAuth?: boolean;
    securities?: { name: string; options: SecuritySchemeObject }[];
};
