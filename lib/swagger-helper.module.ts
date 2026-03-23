import { DynamicModule, Global, Module } from '@nestjs/common';

@Global()
@Module({})
export class SwaggerHelperModule {
    public static forRoot(): DynamicModule {
        return {
            providers: [],
            exports: [],
            imports: [],
            module: SwaggerHelperModule
        };
    }
}
