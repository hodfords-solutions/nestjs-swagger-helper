import { SWAGGER_CONSTANTS } from '../constants/swagger-constants';

export function ApiPublic(): MethodDecorator {
    return (target: any, key: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(SWAGGER_CONSTANTS.PUBLIC_API, true, descriptor.value);
        return descriptor;
    };
}
