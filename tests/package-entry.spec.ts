import { describe, expect, it } from 'vitest';

describe('package entry', () => {
    it('exports something', async () => {
        const mod = await import('../lib/index.js');
        expect(Object.keys(mod).length).toBeGreaterThan(0);
    });

    it('exposes the public API surface', async () => {
        const mod = await import('../lib/index.js');
        expect(typeof mod.SwaggerHelper).toBe('function');
        expect(typeof mod.SwaggerHelperModule).toBe('function');
        expect(typeof mod.ApiPublic).toBe('function');
        expect(typeof mod.ApiPublicController).toBe('function');
        expect(typeof mod.ApiPermissions).toBe('function');
        expect(typeof mod.ApiParamGlobal).toBe('function');
        expect(mod.SWAGGER_CONSTANTS.PUBLIC_API).toBe('HODFORDS:SWAGGER:PUBLIC_API');
    });
});
