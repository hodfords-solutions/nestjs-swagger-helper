<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

# Swagger Helper

## Description

### Configuration
- Create file a file named `swagger-helper.config.ts` with this code below and then add to `app.module.ts` file 
```typescript
// APP_PREFIX is optional, if your application doesn't have this one you can skip
export const swaggerConfig = SwaggerHelperModule.forRoot(APP_PREFIX);
```

- Initialize SwaggerHelper: Import the `SwaggerHelper` and pass these params to initialize it
```typescript
import { SwaggerHelper } from '@hodfords/nestjs-swagger-helper';

type SwaggerInitialization = {
    app: NestExpressApplication;
    appEnv: string;
    path: string;
    title: string;
    description: string;
    version: string;
};

buildSwagger() {
    new SwaggerHelper({
        app: this.app,
        appEnv: env.APP_ENV,
        path: `${env.APP_PREFIX}/documents`,
        title: 'Document for usdol',
        description: 'The usdol API description',
        version: '1.0'
    }).buildDocuments();
} 
```

### Decorators
The library has 2 decorators that you can import to your project
- @ApiPublic (mark which APIS are for public)
- @ApiSetValue (usually add to login/signin API to automatically add jwt-token to swagger when requesting successfully)
