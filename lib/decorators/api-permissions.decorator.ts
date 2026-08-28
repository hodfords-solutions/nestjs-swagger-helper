import { SWAGGER_CONSTANTS } from '../constants/swagger-constants.js';

export function ApiPermissions(permissions: string[]): MethodDecorator {
    return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
        Reflect.defineMetadata(SWAGGER_CONSTANTS.PERMISSIONS, permissions, descriptor.value);
        return descriptor;
    };
}
