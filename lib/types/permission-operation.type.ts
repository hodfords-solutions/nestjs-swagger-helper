import { OperationObject } from '@nestjs/swagger';

/* eslint-disable @typescript-eslint/naming-convention -- OpenAPI extension keys are `x-` prefixed by spec */
export type PermissionOperationObject = OperationObject & {
    'x-permissions'?: string[];
};
