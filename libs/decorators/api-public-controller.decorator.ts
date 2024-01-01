import { ApiPublic } from './api-public.decorator';

export function ApiPublicController<T>(appliedMethods?: (keyof T)[]): ClassDecorator {
    return function (target: any) {
        const descriptors = Object.getOwnPropertyDescriptors(target.prototype);

        for (const [propName, descriptor] of Object.entries(descriptors)) {
            const isMethod = typeof descriptor.value === 'function' && propName !== 'constructor';

            if (!isMethod) {
                continue;
            }

            if (appliedMethods?.length && !appliedMethods.includes(propName as keyof T)) {
                continue;
            }

            ApiPublic()(target.prototype, propName, descriptor);
        }
    };
}
