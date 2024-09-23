import { DynamicModule, Global, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import path from 'path';

@Global()
@Module({})
export class SwaggerHelperModule {
    public static forRoot(appPrefix?: string): DynamicModule {
        let serveRoot = `/`;
        if (appPrefix) {
            serveRoot = `/${appPrefix}${serveRoot}`;
        }

        return {
            providers: [],
            exports: [],
            imports: [
                ServeStaticModule.forRoot({
                    rootPath: path.resolve(__dirname, 'static'),
                    renderPath: '/*',
                    serveRoot
                })
            ],
            module: SwaggerHelperModule
        };
    }
}
