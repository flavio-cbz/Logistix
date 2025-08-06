#!/usr/bin/env tsx

/**
 * Debug du token Vinted pour comprendre pourquoi il y a une erreur 401
 */

import { VintedAuthService } from '../../lib/services/auth/vinted-auth-service';

// Cookie frais
const TEST_COOKIE = "v_udt=UzdITVZydENVSlp1Vm5SSy9Na01HNDBNcHVmWS0tWGs2aHBxakJ4RHYvcW1lRi0tMmk3dW8xNUhqUEFpV0hQKzNWNjR3Zz09; anonymous-locale=fr; anon_id=004de3da-c5a2-4bad-be62-af192b0bd515; anon_id=004de3da-c5a2-4bad-be62-af192b0bd515; last_user_id=1; v_uid=276622327; v_sid=21c9522c-1754056805; access_token_web=eyJraWQiOiJFNTdZZHJ1SHBsQWp1MmNObzFEb3JIM2oyN0J1NS1zX09QNVB3UGlobjVNIiwiYWxnIjoiUFMyNTYifQ.eyJhcHBfaWQiOjQsImNsaWVudF9pZCI6IndlYiIsImF1ZCI6ImZyLmNvcmUuYXBpIiwiaXNzIjoidmludGVkLWlhbS1zZXJ2aWNlIiwic3ViIjoiMjc2NjIyMzI3IiwiaWF0IjoxNzU0MjQ5MDA1LCJzaWQiOiIyMWM5NTIyYy0xNzU0MDU2ODA1Iiwic2NvcGUiOiJ1c2VyIiwiZXhwIjoxNzU0MjU2MjA1LCJwdXJwb3NlIjoiYWNjZXNzIiwiYWN0Ijp7InN1YiI6IjI3NjYyMjMyNyJ9LCJhY2NvdW50X2lkIjoyMTc1OTgxMTF9.GEoBrXJnq7zBzxP38jWHz0r9KYMY1nURHLuVVghvaqvuEmO3W00Y9fwdlnCopD0UGk2wFHTO1KnK9a_hR0ZdQqt5kaoatF6fKOO5Tk9YfqH-N_4UCezN21Y7hP8atrxfQCIdmn_rtQyzgtzTdCBJtM4P965N7mJ8H8qV7liGDVL7qtFQ9P2s2iLiraLv4220-BCme22igh_Kk7uBioMu6Zd64EA6RZYN_1GMZUOsHLSvvenS4IqP4f1puE0Yg2QwF1QSaCFx6sm3CFuRrjHPcbpWNyCaIg4d23Z9Y0Dm-dbBNzMdr8uj3muvG_Wvgts5PsGyxR9yblpJkcDujvAo1A; refresh_token_web=eyJraWQiOiJFNTdZZHJ1SHBsQWp1MmNObzFEb3JIM2oyN0J1NS1zX09QNVB3UGlobjVNIiwiYWxnIjoiUFMyNTYifQ.eyJhcHBfaWQiOjQsImNsaWVudF9pZCI6IndlYiIsImF1ZCI6ImZyLmNvcmUuYXBpIiwiaXNzIjoidmludGVkLWlhbS1zZXJ2aWNlIiwic3ViIjoiMjc2NjIyMzI3IiwiaWF0IjoxNzU0MjQ5MDA1LCJzaWQiOiIyMWM5NTIyYy0xNzU0MDU2ODA1Iiwic2NvcGUiOiJ1c2VyIiwiZXhwIjoxNzU0ODUzODA1LCJwdXJwb3NlIjoicmVmcmVzaCIsImFjdCI6eyJzdWIiOiIyNzY2MjIzMjcifSwiYWNjb3VudF9pZCI6MjE3NTk4MTExfQ.ROQlVQg62R3JhNtWd72xKicohYyFXHX90mcuodXnr018X9_CvXyGkXArI0RZPm51e58CYl4UBJuo9ggcuq2Q5ewYWUmqFC4NrVKEw7T8frlDw92Wgc4kgDUnlDgaycKO3cv_Cr_UPtzP0Uxjj9D8PsN6ZeOBQSMnDDWQyAVCBLql7hAoVPAGQ08LI9y3WoXD82yYA9Kda79_AwdrW4gN9-q9noCwZ9bXYUY6l5PNQArFaUXr5OhSVv1zQZIW2LTXv5P3rzzC-cJBIZWq_pSSP3_yGGyMYdqUZ0eJArtmSQvs16KjsN8DDirAWZ0WK-8W2sMmnNWBNnptOMfxAgcNjA; domain_selected=true; viewport_size=1264; homepage_session_id=9dafd07a-01ff-422a-8b04-7f9adbb38cb3; seller_header_visits=3; cf_clearance=bueo5bEpfMD1YIvB0p1xg0oeJnd0FyLgQMqrFHx2sfI-1754253801-1.2.1.1-i7wvX5mbwYRamnqoKn3NsEFN0nA2s8BF_is6SBxTAlnaApXfiQHMCWeLdm59RaS4fOZRKyrHYFFH7ZiLHomVP4vzRWmksHxCUVd8Cno1DmefxCTKg2cp8AnYBZwKpV2dfy_D.KPDwV5lHishAF.Aln.DP_S6aPzxZ.D.VPTrG4pf.9iF3wfuuKP5ORA4QZZY2F_eY0SaGZ1jyeYp1KrrSw5hYvPA8KtUQQzIt8TUGTs; _vinted_fr_session=R1BkdytyRFQ1STRSYUxGcFl4Y1lxTk5wb2hFQ1NMVnZsZWhRUDRNMlNEa2FVejJrZ1lCRytIOWNHZG9NakUrNm9yQmhZSnBVZ3BWVmIwV04xam1aTVBwbHVQa2tmWTdOeXE5S0NveG5WSlJmWC82dWE5bjgwTEluMEc1OVJEOXdJSkJZYUJKUUZQTC8zOUYzbzVoa3Y1dlVRdjc0Y1BrWVhEZlVBbnpYdi9FdHVXWUFQZ3NZQlR3TUdSUnZ1UUQ3WUFRNlNKektpOWc3OG1icjZYUWdJaTRhekNEejFYb2VVREJ3SlY0SENQS1paODdkZDFjTjdIQTI5Q1h1N0lJNi0tL21QdTNHamMrd2xqVHgwUVlnYi9QZz09--8c5078b9cde209aa2726d22f5290483cc3abc47d; datadome=lcU7nLAfEj49ry75Ih48nMvunl8jfGftjhNJXwavniUU3GHcIS7M34zHWqi_u4kPKp1spaBscmHVdwNgUuX93IDSaRjzpFM3ccH_1smKjxpNPHYCepnTMOLguOb5tpX7";

function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    // Ajouter le padding si nécessaire
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = Buffer.from(paddedPayload, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

async function debugToken() {
  console.log('🔍 Debug du token Vinted\n');

  // 1. Extraire les tokens
  const accessToken = VintedAuthService.extractAccessTokenFromCookie(TEST_COOKIE);
  const refreshToken = VintedAuthService.extractRefreshTokenFromCookie(TEST_COOKIE);
  
  console.log('📝 Tokens extraits:');
  console.log(`Access token: ${accessToken ? 'Présent' : 'Absent'} (${accessToken?.length || 0} caractères)`);
  console.log(`Refresh token: ${refreshToken ? 'Présent' : 'Absent'} (${refreshToken?.length || 0} caractères)`);

  // 2. Décoder le JWT access token
  if (accessToken) {
    console.log('\n🔓 Décodage du JWT access token:');
    const decoded = decodeJWT(accessToken);
    if (decoded) {
      console.log('Payload décodé:');
      console.log(`  - Subject (sub): ${decoded.sub}`);
      console.log(`  - Issued at (iat): ${decoded.iat} (${new Date(decoded.iat * 1000).toLocaleString()})`);
      console.log(`  - Expires at (exp): ${decoded.exp} (${new Date(decoded.exp * 1000).toLocaleString()})`);
      console.log(`  - Session ID (sid): ${decoded.sid}`);
      console.log(`  - Account ID: ${decoded.account_id}`);
      console.log(`  - Purpose: ${decoded.purpose}`);
      console.log(`  - Scope: ${decoded.scope}`);
      
      // Vérifier si le token est expiré
      const now = Math.floor(Date.now() / 1000);
      const isExpired = decoded.exp < now;
      console.log(`  - Token expiré: ${isExpired ? 'OUI' : 'NON'}`);
      
      if (isExpired) {
        const expiredSince = now - decoded.exp;
        console.log(`  - Expiré depuis: ${expiredSince} secondes (${Math.floor(expiredSince / 60)} minutes)`);
      } else {
        const expiresIn = decoded.exp - now;
        console.log(`  - Expire dans: ${expiresIn} secondes (${Math.floor(expiresIn / 60)} minutes)`);
      }
    } else {
      console.log('❌ Impossible de décoder le JWT');
    }
  }

  // 3. Décoder le refresh token
  if (refreshToken) {
    console.log('\n🔄 Décodage du JWT refresh token:');
    const decoded = decodeJWT(refreshToken);
    if (decoded) {
      console.log('Payload décodé:');
      console.log(`  - Subject (sub): ${decoded.sub}`);
      console.log(`  - Issued at (iat): ${decoded.iat} (${new Date(decoded.iat * 1000).toLocaleString()})`);
      console.log(`  - Expires at (exp): ${decoded.exp} (${new Date(decoded.exp * 1000).toLocaleString()})`);
      console.log(`  - Purpose: ${decoded.purpose}`);
      
      // Vérifier si le refresh token est expiré
      const now = Math.floor(Date.now() / 1000);
      const isExpired = decoded.exp < now;
      console.log(`  - Refresh token expiré: ${isExpired ? 'OUI' : 'NON'}`);
      
      if (isExpired) {
        const expiredSince = now - decoded.exp;
        console.log(`  - Expiré depuis: ${expiredSince} secondes (${Math.floor(expiredSince / 60)} minutes)`);
      } else {
        const expiresIn = decoded.exp - now;
        console.log(`  - Expire dans: ${expiresIn} secondes (${Math.floor(expiresIn / 3600)} heures)`);
      }
    }
  }

  // 4. Test de validation détaillé
  console.log('\n🧪 Test de validation détaillé:');
  const authService = new VintedAuthService(TEST_COOKIE);
  const validationResult = await authService.validateAccessToken();
  
  console.log(`Status HTTP: ${validationResult.status}`);
  console.log(`Token valide: ${validationResult.valid}`);
  console.log(`Cookie envoyé: ${validationResult.cookieSent?.substring(0, 100)}...`);
  
  if (validationResult.body) {
    console.log('Réponse du serveur:');
    console.log(JSON.stringify(validationResult.body, null, 2));
  }
  
  if (validationResult.error) {
    console.log(`Erreur: ${validationResult.error}`);
  }
}

debugToken();