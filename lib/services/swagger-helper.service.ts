import { Logger } from '@nestjs/common';
import { NestContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper.js';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
    DocumentBuilder,
    OpenAPIObject,
    OperationObject,
    PathsObject,
    RequestBodyObject,
    ResponseObject,
    ReferenceObject,
    SchemaObject,
    SwaggerModule
} from '@nestjs/swagger';
import { Request, Response } from 'express-serve-static-core';
import { apiReference } from '@scalar/nestjs-api-reference';
import { SWAGGER_CONSTANTS } from '../constants/swagger-constants.js';
import { SwaggerInitialization } from '../types/swagger-initialization.type.js';
import { PermissionOperationObject } from '../types/permission-operation.type.js';
import { getSchemaNameFromSchemaObject, getSchemaRef, getSchemas } from '../helpers/swagger-schema.helper.js';

type RouterMetatype = { prototype: Record<string, object>; name: string };

export class SwaggerHelper {
    private logger = new Logger(SwaggerHelper.name);

    private document: OpenAPIObject;
    private readonly app: NestExpressApplication;
    private readonly appEnv: string;
    private readonly appPrefix: string;
    private readonly title: string;
    private readonly description: string;
    private readonly version: string;
    private readonly disablePrivateDocument: boolean;

    constructor(private params: SwaggerInitialization) {
        const {
            app,
            appEnv,
            appPrefix = '',
            title,
            description,
            version,
            disablePrivateDocument = false
        } = this.params;
        this.app = app;
        this.appEnv = appEnv;
        this.appPrefix = appPrefix;
        this.title = title;
        this.description = description;
        this.version = version;
        this.disablePrivateDocument = disablePrivateDocument;
    }

    get publicDocumentPath(): string {
        if (!this.appPrefix) {
            return 'docs';
        }
        return `${this.appPrefix}/docs`;
    }

    get secretDocumentPath(): string {
        if (!this.appPrefix) {
            return 'documents';
        }
        return `${this.appPrefix}/documents`;
    }

    get publicDocumentJsonPath(): string {
        if (!this.appPrefix) {
            return 'docs-json';
        }
        return `${this.appPrefix}/docs-json`;
    }

    get secretDocumentJsonPath(): string {
        if (!this.appPrefix) {
            return 'documents-json';
        }
        return `${this.appPrefix}/documents-json`;
    }

    public buildDocuments(): void {
        this.buildPublicDocuments();
        this.logger.log(`Public document is ready at ${this.publicDocumentPath}`);

        if (this.disablePrivateDocument !== true) {
            this.buildPrivateDocuments();
            this.logger.log(`Private document is ready at ${this.secretDocumentPath}`);
        }
    }

    buildPublicDocuments(): void {
        const publicDocument = this.getPublicDocument();
        this.app.use(
            `/${this.publicDocumentPath}`,
            apiReference({
                spec: { content: publicDocument },
                ...this.params.scalarConfig
            })
        );
        this.app.use(`/${this.publicDocumentJsonPath}`, (req: Request, res: Response) => {
            res.json(publicDocument);
        });
    }

    getPublicDocument(): OpenAPIObject {
        const config = new DocumentBuilder()
            .setTitle(this.title)
            .setDescription(this.description)
            .setVersion(this.version);
        this.configSecurity(config);

        if (this.params.securityRequirements) {
            for (const securityRequirement of this.params.securityRequirements) {
                config.addSecurityRequirements(securityRequirement.name, securityRequirement.requirements);
            }
        }

        const publicDocument = SwaggerModule.createDocument(this.app, config.build());
        this.mergeSecurityRequirements(publicDocument);
        const allSchemas = getSchemas(publicDocument);
        this.filterPublicDocuments(publicDocument);
        getSchemas(publicDocument);
        publicDocument.components!.schemas = this.getPublicSchema(publicDocument);
        this.getNestedPublicSchemas(publicDocument, allSchemas);

        return publicDocument;
    }

    private configSecurity(config: DocumentBuilder): void {
        if (this.params.addBearerAuth !== false) {
            config.addBearerAuth();
        }
        if (this.params.securities) {
            for (const security of this.params.securities) {
                config.addSecurity(security.name, security.options);
            }
        }
    }

    private mergeSecurityRequirements(document: OpenAPIObject): void {
        if (!this.params.mergeSecurityGroups?.length) {
            return;
        }

        const groups = this.params.mergeSecurityGroups.map((group) => new Set(group));

        const globalSecurityMap = new Map<string, string[]>();
        if (document.security) {
            for (const requirement of document.security) {
                for (const [name, scopes] of Object.entries(requirement)) {
                    globalSecurityMap.set(name, scopes);
                }
            }
        }

        for (const path in document.paths) {
            const pathItem = document.paths[path] as Record<string, OperationObject>;
            for (const method in pathItem) {
                const operation = pathItem[method];
                if (!operation.security?.length) {
                    continue;
                }

                for (const group of groups) {
                    const merged: Record<string, string[]> = {};
                    const rest: Record<string, string[]>[] = [];

                    for (const requirement of operation.security) {
                        const keys = Object.keys(requirement);
                        if (keys.length === 1 && group.has(keys[0])) {
                            merged[keys[0]] = requirement[keys[0]];
                        } else {
                            rest.push(requirement);
                        }
                    }

                    if (Object.keys(merged).length) {
                        for (const name of group) {
                            if (!(name in merged)) {
                                merged[name] = globalSecurityMap.get(name) || [];
                            }
                        }
                        operation.security = [merged, ...rest];
                    }
                }
            }
        }
    }

    private getPublicSchema(publicDocument: OpenAPIObject): Record<string, SchemaObject | ReferenceObject> {
        const schemas: Record<string, SchemaObject | ReferenceObject> = {};
        const allSchemas = getSchemas(publicDocument);
        for (const key of Object.keys(allSchemas)) {
            if (this.checkDocumentUseSchema(publicDocument, key)) {
                schemas[key] = allSchemas[key];
            }
        }
        return schemas;
    }

    private collectNestedSchemas(
        publicDocument: OpenAPIObject,
        allSchemas: Record<string, SchemaObject | ReferenceObject>,
        schema: SchemaObject,
        schemas: Record<string, unknown>,
        property: string
    ) {
        const propertySchema = schema.properties?.[property];
        const schemaName = propertySchema ? getSchemaNameFromSchemaObject(propertySchema) : undefined;

        if (!schemaName || schemas[schemaName]) {
            return;
        }

        if (!getSchemas(publicDocument)[schemaName]) {
            schemas[schemaName] = allSchemas[schemaName];
        }
    }

    private getNestedPublicSchemas(
        publicDocument: OpenAPIObject,
        allSchemas: Record<string, SchemaObject | ReferenceObject>
    ): void {
        const schemas: Record<string, unknown> = {};
        const publicSchemas = getSchemas(publicDocument);
        for (const key in publicSchemas) {
            const schema = publicSchemas[key] as SchemaObject;
            for (const property in schema.properties) {
                this.collectNestedSchemas(publicDocument, allSchemas, schema, schemas, property);
            }
        }

        if (Object.keys(schemas).length) {
            publicDocument.components!.schemas = {
                ...getSchemas(publicDocument),
                ...(schemas as Record<string, SchemaObject | ReferenceObject>)
            };

            this.getNestedPublicSchemas(publicDocument, allSchemas);
        }
    }

    private checkDocumentUseSchema(publicDocument: OpenAPIObject, schemaName: string): boolean {
        const routers = this.getDocumentRouters(publicDocument);
        for (const router of routers) {
            const requestBody = router.action?.requestBody as RequestBodyObject | undefined;
            for (const contentType in requestBody?.content) {
                const schema = requestBody?.content[contentType]?.schema;
                const ref = schema && '$ref' in schema ? schema.$ref : undefined;
                if (ref && ref.endsWith(`/${schemaName}`)) {
                    return true;
                }
            }

            const responses = router.action?.responses ?? {};
            for (const status in responses) {
                const response = responses[status] as ResponseObject | undefined;
                const ref = getSchemaRef(response?.content?.['application/json']?.schema);
                if (ref && ref.endsWith(`/${schemaName}`)) {
                    return true;
                }
            }
        }

        return false;
    }

    private filterPublicDocuments(publicDocument: OpenAPIObject): void {
        const paths: PathsObject = {};
        const properties = this.getRouterProperty();
        for (const property of properties) {
            const isPublicAPI = Reflect.getMetadata(
                SWAGGER_CONSTANTS.PUBLIC_API,
                property.metatype.prototype[property.name]
            );
            if (isPublicAPI) {
                const routers = this.getDocumentRouters(publicDocument);
                for (const router of routers) {
                    if (router.action.operationId === `${property.metatype.name}_${property.name}`) {
                        if (!paths.hasOwnProperty(router.path)) {
                            paths[router.path] = {};
                        }
                        (paths[router.path] as Record<string, OperationObject>)[router.method] = (
                            publicDocument.paths[router.path] as Record<string, OperationObject>
                        )[router.method];
                    }
                }
            }
        }
        publicDocument.paths = paths;
    }

    buildPrivateDocuments(): void {
        const config = new DocumentBuilder()
            .setTitle(this.title)
            .setDescription(this.description)
            .setVersion(this.version);
        this.configSecurity(config);

        if (this.params.securityRequirements) {
            for (const securityRequirement of this.params.securityRequirements) {
                config.addSecurityRequirements(securityRequirement.name, securityRequirement.requirements);
            }
        }

        this.document = SwaggerModule.createDocument(this.app, config.build());
        this.mergeSecurityRequirements(this.document);

        this.addPermissionsExtension();
        this.app.use(
            `/${this.secretDocumentPath}`,
            apiReference({
                spec: { content: this.document },
                ...this.params.scalarConfig
            })
        );
        this.app.use(`/${this.secretDocumentJsonPath}`, (req: Request, res: Response) => {
            res.json(this.document);
        });
    }

    private getRouterProperty(): { name: string; router: InstanceWrapper; metatype: RouterMetatype }[] {
        const container: NestContainer = (this.app as any).container;
        const modules = container.getModules();
        const properties: { name: string; router: InstanceWrapper; metatype: RouterMetatype }[] = [];
        for (const module of modules.values()) {
            for (const router of module.controllers.values()) {
                const metatype = router.metatype as RouterMetatype | null;
                if (!metatype?.prototype) {
                    continue;
                }
                for (const property of Object.getOwnPropertyNames(metatype.prototype)) {
                    properties.push({
                        name: property,
                        router,
                        metatype
                    });
                }
            }
        }

        return properties;
    }

    addPermissionsExtension(): void {
        const properties = this.getRouterProperty();
        for (const property of properties) {
            const permissions = Reflect.getMetadata(
                SWAGGER_CONSTANTS.PERMISSIONS,
                property.metatype.prototype[property.name]
            );
            if (permissions) {
                this.addPermissionToDocument(permissions, `${property.metatype.name}_${property.name}`);
            }
        }
    }

    private getDocumentRouters(document: OpenAPIObject): { path: string; method: string; action: OperationObject }[] {
        const routers: { path: string; method: string; action: OperationObject }[] = [];
        for (const path in document.paths) {
            const pathItem = document.paths[path] as Record<string, OperationObject>;
            for (const method in pathItem) {
                routers.push({
                    path: path,
                    method: method,
                    action: pathItem[method]
                });
            }
        }
        return routers;
    }

    private addPermissionToDocument(permissions: string[], operationId: string): void {
        const routers = this.getDocumentRouters(this.document);
        for (const path of routers) {
            if (path.action.operationId === operationId) {
                const action = path.action as PermissionOperationObject;
                if (!action['x-permissions']) {
                    action['x-permissions'] = [];
                }
                action['x-permissions'].push(...permissions);
            }
        }
    }
}
