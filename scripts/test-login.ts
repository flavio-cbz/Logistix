
import { serviceContainer } from '@/lib/services/container';

async function testLogin() {
    try {
        const authService = serviceContainer.getAuthService();
        console.log('Attempting login...');
        const result = await authService.authenticate('admin', 'admin123');
        console.log('Login result:', result);
    } catch (error) {
        console.error('Login failed:', error);
    }
}

testLogin();
