import { OpenAPIObject, ReferenceObject, SchemaObject } from '@nestjs/swagger';

/** `createDocument` always populates these, but the OpenAPI types mark them optional. */
export function getSchemas(document: OpenAPIObject): Record<string, SchemaObject | ReferenceObject> {
    document.components ??= {};
    document.components.schemas ??= {};

    return document.components.schemas;
}

export function getSchemaNameFromRef(ref: string): string {
    return ref.split('/').pop() ?? '';
}

/** The `$ref` a schema points at, either directly or through its array `items`. */
export function getSchemaRef(schema?: SchemaObject | ReferenceObject): string | undefined {
    if (!schema) {
        return undefined;
    }

    if ('$ref' in schema) {
        return schema.$ref;
    }

    return schema.items && '$ref' in schema.items ? schema.items.$ref : undefined;
}

export function getSchemaNameFromSchemaObject(schema: SchemaObject | ReferenceObject): string | undefined {
    const ref = getSchemaRef(schema);

    return ref ? getSchemaNameFromRef(ref) : undefined;
}
