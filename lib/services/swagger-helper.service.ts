import { Logger } from '@nestjs/common';
import { NestContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ReferenceObject, SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { SWAGGER_CONSTANTS } from '../constants/swagger-constants';
import { SwaggerInitialization } from '../types/swagger-initialization.type';

declare let window;

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
        const { app, appEnv, appPrefix = '', title, description, version, disablePrivateDocument } = this.params;
        this.app = app;
        this.appEnv = appEnv;
        this.appPrefix = appPrefix;
        this.title = title;
        this.description = description;
        this.version = version;
        this.disablePrivateDocument = disablePrivateDocument;
    }

    get publicDocumentPath(): string {
        return `${this.appPrefix}/docs`;
    }

    get secretDocumentPath(): string {
        return `${this.appPrefix}/documents`;
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
        SwaggerModule.setup(this.publicDocumentPath, this.app, this.getPublicDocument());
    }

    getPublicDocument(): OpenAPIObject {
        const config = new DocumentBuilder()
            .setTitle(this.title)
            .setDescription(this.description)
            .setVersion(this.version);
        this.configSecurity(config);

        const publicDocument = SwaggerModule.createDocument(this.app, config.build());
        const allSchemas = publicDocument.components.schemas;
        this.filterPublicDocuments(publicDocument);
        publicDocument.components.schemas = this.getPublicSchema(publicDocument);
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

    private getPublicSchema(publicDocument: OpenAPIObject): Record<string, SchemaObject | ReferenceObject> {
        const schemas = {};
        for (const key of Object.keys(publicDocument.components.schemas)) {
            if (this.checkDocumentUseSchema(publicDocument, key)) {
                schemas[key] = publicDocument.components.schemas[key];
            }
        }
        return schemas;
    }

    private getSchemaNameFromRef(ref: string): string {
        return ref.split('/').pop();
    }

    private collectNestedSchemas(
        publicDocument: OpenAPIObject,
        allSchemas: Record<string, SchemaObject | ReferenceObject>,
        schema: SchemaObject,
        schemas: Record<string, unknown>,
        property: string
    ) {
        const schemaName: string = this.getSchemaNameFromSchemaObject(schema.properties[property]);

        if (!schemaName || schemas[schemaName]) {
            return;
        }

        if (!publicDocument.components.schemas[schemaName]) {
            schemas[schemaName] = allSchemas[schemaName];
        }
    }

    private getSchemaNameFromSchemaObject(schema: SchemaObject | ReferenceObject): string {
        if ('$ref' in schema) {
            return this.getSchemaNameFromRef(schema.$ref);
        }

        if (schema.items && '$ref' in schema.items) {
            return this.getSchemaNameFromRef(schema.items.$ref);
        }
    }

    private getNestedPublicSchemas(
        publicDocument: OpenAPIObject,
        allSchemas: Record<string, SchemaObject | ReferenceObject>
    ): void {
        const schemas = {};
        for (const key in publicDocument.components.schemas) {
            const schema = publicDocument.components.schemas[key] as SchemaObject;
            for (const property in schema.properties) {
                this.collectNestedSchemas(publicDocument, allSchemas, schema, schemas, property);
            }
        }

        if (Object.keys(schemas).length) {
            publicDocument.components.schemas = {
                ...publicDocument.components.schemas,
                ...schemas
            };

            this.getNestedPublicSchemas(publicDocument, allSchemas);
        }
    }

    private checkDocumentUseSchema(publicDocument: OpenAPIObject, schemaName: string): boolean {
        const routers = this.getDocumentRouters(publicDocument);
        for (const router of routers) {
            for (const contentType in router.action?.requestBody?.content) {
                const ref = router.action.requestBody.content[contentType]?.schema?.$ref;
                if (ref && ref.endsWith(`/${schemaName}`)) {
                    return true;
                }
            }

            for (const status in router.action?.responses) {
                const schemaRef = router.action.responses[status]?.content?.['application/json']?.schema;
                const ref = schemaRef?.$ref || schemaRef?.items?.$ref;
                if (ref && ref.endsWith(`/${schemaName}`)) {
                    return true;
                }
            }
        }

        return false;
    }

    private filterPublicDocuments(publicDocument: OpenAPIObject): void {
        const paths = {};
        const properties = this.getRouterProperty();
        for (const property of properties) {
            const isPublicAPI = Reflect.getMetadata(
                SWAGGER_CONSTANTS.PUBLIC_API,
                property.router.metatype.prototype[property.name]
            );
            if (isPublicAPI) {
                const routers = this.getDocumentRouters(publicDocument);
                for (const router of routers) {
                    if (router.action.operationId === `${property.router.metatype.name}_${property.name}`) {
                        if (!paths.hasOwnProperty(router.path)) {
                            paths[router.path] = {};
                        }
                        paths[router.path][router.method] = publicDocument.paths[router.path][router.method];
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
        this.document = SwaggerModule.createDocument(this.app, config.build());

        this.addHelper();
        SwaggerModule.setup(this.secretDocumentPath, this.app, this.document, {
            customJs: './swagger-helper.js',
            swaggerOptions: {
                requestInterceptor: (request) => {
                    request.responseInterceptor = (response) => {
                        window.handleRequest(request, response);
                    };
                    return request;
                }
            }
        });
    }

    private getRouterProperty(): { name: string; router: InstanceWrapper }[] {
        const container: NestContainer = (this.app as any).container;
        const modules = container.getModules();
        const properties = [];
        for (const module of modules.values()) {
            for (const router of module.controllers.values()) {
                for (const property of Object.getOwnPropertyNames(router.metatype.prototype)) {
                    properties.push({
                        name: property,
                        router
                    });
                }
            }
        }

        return properties;
    }

    addHelper(): void {
        const properties = this.getRouterProperty();
        for (const property of properties) {
            const actionSetValue = Reflect.getMetadata(
                SWAGGER_CONSTANTS.SET_VALUE,
                property.router.metatype.prototype[property.name]
            );
            if (actionSetValue) {
                this.addCustomValueToDocument(actionSetValue, `${property.router.metatype.name}_${property.name}`);
            }
        }
    }

    private getDocumentRouters(document: OpenAPIObject) {
        const routers = [];
        for (const path in document.paths) {
            for (const method in document.paths[path]) {
                routers.push({
                    path: path,
                    method: method,
                    action: document.paths[path][method]
                });
            }
        }
        return routers;
    }

    private addCustomValueToDocument(actionSetValue, operationId): void {
        const routers = this.getDocumentRouters(this.document);
        for (const path of routers) {
            if (path.action.operationId === operationId) {
                if (!path.action.actionSetValue) {
                    path.action.actionSetValue = [];
                }
                path.action.actionSetValue.push(actionSetValue);
            }
        }
    }
}
