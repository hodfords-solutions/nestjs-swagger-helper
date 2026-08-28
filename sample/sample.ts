import { Controller, Get, Module, Post, Body } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiSecurity } from '@nestjs/swagger';
import {
    SwaggerHelperModule,
    SwaggerHelper,
    ApiPublic,
    ApiPublicController,
    ApiPermissions,
    ApiParamGlobal,
} from '../lib/index.js';

// ─── DTOs ────────────────────────────────────────────────────────────────────

class LoginDto {
    @ApiProperty({ example: 'admin@example.com' })
    email: string;

    @ApiProperty({ example: 'password123' })
    password: string;
}

class LoginResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    accessToken: string;
}

class UserDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: 'admin@example.com' })
    email: string;

    @ApiProperty({ example: 'Admin User' })
    name: string;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

@ApiTags('Auth')
@Controller('auth')
class AuthController {
    @Post('login')
    @ApiPublic()
    @ApiOperation({ summary: 'Login and receive JWT token' })
    @ApiResponse({ status: 200, type: LoginResponseDto })
    login(@Body() body: LoginDto): LoginResponseDto {
        return { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' };
    }
}

/**
 * Public controller - all methods are marked as public using @ApiPublicController.
 * You can optionally pass method names to apply it selectively.
 */
@ApiTags('Public')
@Controller('public')
@ApiPublicController<PublicController>()
class PublicController {
    @Get('health')
    @ApiOperation({ summary: 'Health check' })
    healthCheck(): { status: string } {
        return { status: 'ok' };
    }

    @Get('version')
    @ApiOperation({ summary: 'Get API version' })
    getVersion(): { version: string } {
        return { version: '1.0.0' };
    }
}

/**
 * Users controller - uses @ApiPermissions and @ApiParamGlobal.
 * @ApiParamGlobal applies a shared parameter to all (or selected) methods.
 */
@ApiTags('Users')
@Controller('organizations/:organizationId/users')
@ApiParamGlobal<UsersController>({ name: 'organizationId', type: 'string', description: 'Organization ID' })
class UsersController {
    @Get()
    @ApiPermissions(['user:read'])
    @ApiOperation({ summary: 'List all users' })
    @ApiResponse({ status: 200, type: [UserDto] })
    listUsers(): UserDto[] {
        return [];
    }

    @Get(':id')
    @ApiPermissions(['user:read'])
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, type: UserDto })
    getUser(): UserDto {
        return { id: 1, email: 'admin@example.com', name: 'Admin User' };
    }

    @Post()
    @ApiPermissions(['user:create'])
    @ApiOperation({ summary: 'Create a new user' })
    @ApiSecurity('ApiKey')
    @ApiSecurity('TenantId')
    @ApiResponse({ status: 201, type: UserDto })
    createUser(): UserDto {
        return { id: 2, email: 'new@example.com', name: 'New User' };
    }
}

// ─── App Module ──────────────────────────────────────────────────────────────

const APP_PREFIX = 'api';

@Module({
    imports: [SwaggerHelperModule.forRoot()],
    controllers: [AuthController, PublicController, UsersController],
})
class AppModule {}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.setGlobalPrefix(APP_PREFIX);

    new SwaggerHelper({
        app,
        appEnv: process.env.APP_ENV || 'development',
        appPrefix: APP_PREFIX,
        title: 'Sample API',
        description: 'Sample API using @hodfords/nestjs-swagger-helper',
        version: '1.0',
        disablePrivateDocument: process.env.APP_ENV === 'production',
        // Optional: add custom security schemes
        securities: [
            {
                name: 'ApiKey',
                options: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-KEY'
                }
            },
            {
                name: 'TenantId',
                options: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-TENANT-ID'
                }
            }
        ],
        scalarConfig: {
            layout: 'modern',
            defaultOpenAllTags: true,
            showOperationId: true,
            hideClientButton: true,
            showSidebar: true,
            showDeveloperTools: 'localhost',
            showToolbar: 'localhost',
            operationTitleSource: 'summary',
            theme: 'default',
            persistAuth: true,
            telemetry: true,
            isEditable: false,
            isLoading: false,
            hideModels: false,
            documentDownloadType: 'both',
            hideTestRequestButton: false,
            hideSearch: false,
            hideDarkModeToggle: false,
            withDefaultFonts: true,
            defaultOpenFirstTag: true,
            expandAllModelSections: false,
            expandAllResponses: false,
            orderSchemaPropertiesBy: 'alpha',
            orderRequiredPropertiesFirst: true,
            _integration: 'nestjs',
            default: false,
            agent: {
                disabled: true
            },
            mcp: {
                disabled: true
            }
        },
        mergeSecurityGroups: [['ApiKey', 'TenantId']]
    }).buildDocuments();

    await app.listen(3000);
    console.log('Application is running on http://localhost:3000');
    console.log(`Public docs:  http://localhost:3000/${APP_PREFIX}/docs`);
    console.log(`Private docs: http://localhost:3000/${APP_PREFIX}/documents`);
}

bootstrap();
