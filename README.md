<p align="center">
  <a href="http://opensource.hodfords.uk" target="blank"><img src="https://opensource.hodfords.uk/img/logo.svg" width="320" alt="Hodfords Logo" /></a>
</p>

<p align="center"> <b>nestjs-swagger-helper</b> streamlines the integration of Swagger documentation in NestJS applications. It provides utilities and decorators to simplify the creation and management of API documentation, making it easier to keep your API specs up-to-date and accessible.</p>

## Installation 🤖

Install the `nestjs-swagger-helper` package with:

```
npm install @hodfords/nestjs-swagger-helper --save
```

Next, create a file named `swagger-helper.config.ts` and add the following code. Then, include it in your `app.module.ts` file:

```typescript
// APP_PREFIX is optional, if your application doesn't have this one you can skip
export const swaggerConfig = SwaggerHelperModule.forRoot(APP_PREFIX);
```

Import the `SwaggerHelper` and use it to initialize Swagger

```typescript
import { SwaggerHelper } from '@hodfords/nestjs-swagger-helper';

type SwaggerInitialization = {
    app: NestExpressApplication;
    appEnv: string;
    path: string;
    title: string;
    description: string;
    version: string;
    disablePrivateDocument: boolean;
};

buildSwagger() {
    new SwaggerHelper({
        app: this.app,
        appEnv: env.APP_ENV,
        path: `${env.APP_PREFIX}/documents`,
        title: 'Document for usdol',
        description: 'The usdol API description',
        version: '1.0',
        disablePrivateDocument: env.APP_ENV === 'production',
    }).buildDocuments();
}
```

## Usage 🚀

### Decorators

The library provides two decorators you can use:

-   `@ApiPublic`: Marks APIs as public.
-   `@ApiSetValue`: Typically used for login/signin APIs to automatically add a JWT token to Swagger when the request is
    successful.

## License 📝

This project is licensed under the MIT License
