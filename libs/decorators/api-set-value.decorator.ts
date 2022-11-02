import { SWAGGER_CONSTANTS } from '../constants/swagger-constants';

export function ApiSetValue(actionKey: string, value: string): MethodDecorator {
    return (target: any, key: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(SWAGGER_CONSTANTS.SET_VALUE, { key: actionKey, value }, descriptor.value);
        return descriptor;
    };
}
