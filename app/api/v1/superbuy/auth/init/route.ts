<<<<<<< HEAD
/**
 * Initialise le flow OAuth/Login pour Superbuy
 * GET /api/v1/superbuy/auth/init
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Ancien comportement: ouverture directe de la page Superbuy (non viable pour capturer les cookies côté serveur)
  // Nouveau: declencher le script d authentification interactive cote serveur, puis verifier la session

  // Retourner une page HTML qui gère le login et sauvegarde les cookies
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connexion à Superbuy</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 90%;
      text-align: center;
    }
    h1 {
      margin-top: 0;
      color: #333;
    }
    p {
      color: #666;
      line-height: 1.6;
    }
    .btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 1rem;
      transition: all 0.3s;
    }
    .btn:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
      display: none;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .success {
      color: #10b981;
      font-weight: 600;
      display: none;
    }
    .step {
      text-align: left;
      padding: 0.5rem;
      margin: 0.5rem 0;
      border-left: 3px solid #e5e7eb;
      padding-left: 1rem;
      color: #666;
    }
    .step.active {
      border-left-color: #667eea;
      background: #f3f4f6;
      color: #333;
    }
    .step.done {
      border-left-color: #10b981;
      color: #10b981;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Connexion a Superbuy</h1>
  <p>
    Cliquez sur le bouton ci-dessous pour demarrer l'authentification.
    - En developpement: une fenetre Superbuy s'ouvrira pour un login manuel.
    - En production: si le login manuel n'est pas disponible, on vous demandera vos identifiants pour un login securise cote serveur (headless).
  </p>

  <form id="credForm" onsubmit="return false;" style="display:none; text-align:left; margin-top:1rem; flex-direction:column; gap:0.5rem;">
      <label style="display:block; margin-bottom:0.5rem;">Email/Username
        <input id="username" type="text" placeholder="Email/Username" style="width:100%; padding:8px; border:1px solid #e5e7eb; border-radius:6px; box-sizing:border-box;" />
      </label>
      <label style="display:block; margin-bottom:0.5rem;">Password
        <input id="password" type="password" placeholder="Password" style="width:100%; padding:8px; border:1px solid #e5e7eb; border-radius:6px; box-sizing:border-box;" />
      </label>
      <p style="font-size: 12px; color:#6b7280; margin-top:0.5rem;">Vos identifiants sont utilises uniquement pour etablir la session cote serveur et ne sont pas stockes.</p>
    </form>
    
    <div id="steps" style="display: none; margin: 1.5rem 0;">
      <div class="step" id="step1">Ouverture de Superbuy...</div>
      <div class="step" id="step2">En attente de connexion...</div>
      <div class="step" id="step3">Sauvegarde de la session...</div>
      <div class="step" id="step4">Verification...</div>
    </div>
    
    <div class="spinner" id="spinner"></div>
    <p class="success" id="success">Connexion reussie ! Vous pouvez fermer cette fenetre.</p>
    
    <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
      <button class="btn" id="loginBtn">
        Se connecter a Superbuy
      </button>
      <button class="btn" id="credsBtn" style="background:#10b981;">
        Utiliser mes identifiants (serveur)
      </button>
    </div>
  </div>

  <script>
    (function() {

      
      let checkInterval = null;
      let needsCreds = false;
      
      function updateStep(stepId, active, done) {
        var step = document.getElementById(stepId);
        if (!step) return;
        
        step.classList.remove('active', 'done');
        if (done) {
          step.classList.add('done');
          step.innerHTML = step.innerHTML.replace('...', ' OK');
        } else if (active) {
          step.classList.add('active');
        }
      }

      function startLogin() {

        
        var loginBtn = document.getElementById('loginBtn');
        var stepsDiv = document.getElementById('steps');
        var spinner = document.getElementById('spinner');
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (stepsDiv) stepsDiv.style.display = 'block';
        if (spinner) spinner.style.display = 'block';
        
        updateStep('step1', true, false);
        
        if (!needsCreds) {
          fetch('/api/v1/superbuy/auth/interactive', { method: 'POST' })
            .then(function(resp) {
              if (!resp.ok) {
                return resp.json().then(function(data) {
                  if (data && data.needsCredentials) {
                    needsCreds = true;
                    if (spinner) spinner.style.display = 'none';
                    updateStep('step1', false, true);
                    updateStep('step2', false, false);
                    var steps = document.getElementById('steps');
                    if (steps) {
                      steps.insertAdjacentHTML('beforeend', '<div class="step active" id="step2b">Veuillez saisir vos identifiants Superbuy ci-dessous</div>');
                    }
                    var form = document.getElementById('credForm');
                    if (form) form.style.display = 'flex';
                    if (loginBtn) {
                      loginBtn.textContent = 'Se connecter (serveur)';
                      loginBtn.style.display = 'inline-block';
                    }
                    return;
                  }
                  throw new Error('Impossible de demarrer l authentification interactive');
                });
              }
              return handleAuthStarted();
            })
            .catch(function(e) {
              // console.error('[Auth] Erreur demarrage:', e);
              alert('Erreur lors du demarrage de l authentification interactive.');
              location.reload();
            });
        } else {
          var usernameEl = document.getElementById('username');
          var passwordEl = document.getElementById('password');
          var username = usernameEl ? usernameEl.value.trim() : '';
          var password = passwordEl ? passwordEl.value.trim() : '';
          

          
          if (!username || !password) {
            alert('Veuillez saisir vos identifiants.');
            if (spinner) spinner.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'inline-block';
            return;
          }
          
          if (spinner) spinner.style.display = 'block';
          updateStep('step2', true, false);
          

          
          fetch('/api/v1/superbuy/auth/interactive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
          })
            .then(function(resp) {

              if (!resp.ok) {
                return resp.json().then(function(err) {
                  // console.error('[Auth] Erreur serveur:', err);
                  throw new Error(err.error || 'Echec de l authentification serveur');
                });
              }
              return resp.json().then(function(data) {

                return handleAuthStarted();
              });
            })
            .catch(function(e) {
              // console.error('[Auth] Erreur:', e);
              alert('Erreur: ' + e.message);
              location.reload();
            });
        }
      }
      
      function handleAuthStarted() {
        updateStep('step1', false, true);
        updateStep('step2', true, false);
        checkInterval = setInterval(checkAuthStatus, 2000);
        setTimeout(function() {
          if (checkInterval) {
            clearInterval(checkInterval);
            alert('Delai d attente depasse. Veuillez reessayer.');
            location.reload();
          }
        }, 300000);
      }
      
      function checkAuthStatus() {
        fetch('/api/v1/superbuy/auth/verify')
          .then(function(response) { return response.json(); })
          .then(function(data) {

            if (data.authenticated) {
              clearInterval(checkInterval);
              checkInterval = null;
              updateStep('step2', false, true);
              updateStep('step3', false, true);
              updateStep('step4', true, false);

              updateStep('step4', false, true);
              
              var spinner = document.getElementById('spinner');
              var success = document.getElementById('success');
              if (spinner) spinner.style.display = 'none';
              if (success) success.style.display = 'block';
              
              if (window.opener) {
                window.opener.postMessage({ type: 'superbuy_auth_success' }, '*');
              }
              setTimeout(function() { window.close(); }, 2000);
            }
          })
          .catch(function(error) {

          });
      }

      function startLoginWithCreds() {

        needsCreds = true;
        
        var steps = document.getElementById('steps');
        var form = document.getElementById('credForm');
        var loginBtn = document.getElementById('loginBtn');
        var credsBtn = document.getElementById('credsBtn');
        var spinner = document.getElementById('spinner');
        
        if (steps) steps.style.display = 'block';
        updateStep('step1', false, true);
        if (form) {
          form.style.display = 'flex';

        }
        if (loginBtn) {
          loginBtn.textContent = 'Se connecter (serveur)';
          loginBtn.style.display = 'inline-block';

        }
        if (credsBtn) credsBtn.style.display = 'none';
        if (spinner) spinner.style.display = 'none';
      }
      
      document.addEventListener('DOMContentLoaded', function() {

        var loginBtn = document.getElementById('loginBtn');
        var credsBtn = document.getElementById('credsBtn');
        
        if (loginBtn) {

          loginBtn.addEventListener('click', startLogin);
        } else {
          // console.error('[Auth] Bouton login NON trouve !');
        }
        
        if (credsBtn) {

          credsBtn.addEventListener('click', startLoginWithCreds);
        } else {
          // console.error('[Auth] Bouton credentials NON trouve !');
        }
      });
    })();
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
=======
/**
 * Initialise le flow OAuth/Login pour Superbuy
 * GET /api/v1/superbuy/auth/init
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Ancien comportement: ouverture directe de la page Superbuy (non viable pour capturer les cookies côté serveur)
  // Nouveau: declencher le script d authentification interactive cote serveur, puis verifier la session
  
  // Retourner une page HTML qui gère le login et sauvegarde les cookies
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connexion à Superbuy</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 90%;
      text-align: center;
    }
    h1 {
      margin-top: 0;
      color: #333;
    }
    p {
      color: #666;
      line-height: 1.6;
    }
    .btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 1rem;
      transition: all 0.3s;
    }
    .btn:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
      display: none;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .success {
      color: #10b981;
      font-weight: 600;
      display: none;
    }
    .step {
      text-align: left;
      padding: 0.5rem;
      margin: 0.5rem 0;
      border-left: 3px solid #e5e7eb;
      padding-left: 1rem;
      color: #666;
    }
    .step.active {
      border-left-color: #667eea;
      background: #f3f4f6;
      color: #333;
    }
    .step.done {
      border-left-color: #10b981;
      color: #10b981;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Connexion a Superbuy</h1>
  <p>
    Cliquez sur le bouton ci-dessous pour demarrer l'authentification.
    - En developpement: une fenetre Superbuy s'ouvrira pour un login manuel.
    - En production: si le login manuel n'est pas disponible, on vous demandera vos identifiants pour un login securise cote serveur (headless).
  </p>

  <form id="credForm" onsubmit="return false;" style="display:none; text-align:left; margin-top:1rem; flex-direction:column; gap:0.5rem;">
      <label style="display:block; margin-bottom:0.5rem;">Email/Username
        <input id="username" type="text" placeholder="Email/Username" style="width:100%; padding:8px; border:1px solid #e5e7eb; border-radius:6px; box-sizing:border-box;" />
      </label>
      <label style="display:block; margin-bottom:0.5rem;">Password
        <input id="password" type="password" placeholder="Password" style="width:100%; padding:8px; border:1px solid #e5e7eb; border-radius:6px; box-sizing:border-box;" />
      </label>
      <p style="font-size: 12px; color:#6b7280; margin-top:0.5rem;">Vos identifiants sont utilises uniquement pour etablir la session cote serveur et ne sont pas stockes.</p>
    </form>
    
    <div id="steps" style="display: none; margin: 1.5rem 0;">
      <div class="step" id="step1">Ouverture de Superbuy...</div>
      <div class="step" id="step2">En attente de connexion...</div>
      <div class="step" id="step3">Sauvegarde de la session...</div>
      <div class="step" id="step4">Verification...</div>
    </div>
    
    <div class="spinner" id="spinner"></div>
    <p class="success" id="success">Connexion reussie ! Vous pouvez fermer cette fenetre.</p>
    
    <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
      <button class="btn" id="loginBtn">
        Se connecter a Superbuy
      </button>
      <button class="btn" id="credsBtn" style="background:#10b981;">
        Utiliser mes identifiants (serveur)
      </button>
    </div>
  </div>

  <script>
    (function() {
      console.log('[Auth Init] Page de connexion chargee');
      
      let checkInterval = null;
      let needsCreds = false;
      
      function updateStep(stepId, active, done) {
        var step = document.getElementById(stepId);
        if (!step) return;
        
        step.classList.remove('active', 'done');
        if (done) {
          step.classList.add('done');
          step.innerHTML = step.innerHTML.replace('...', ' OK');
        } else if (active) {
          step.classList.add('active');
        }
      }

      function startLogin() {
        console.log('[Auth] Demarrage de l authentification...');
        
        var loginBtn = document.getElementById('loginBtn');
        var stepsDiv = document.getElementById('steps');
        var spinner = document.getElementById('spinner');
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (stepsDiv) stepsDiv.style.display = 'block';
        if (spinner) spinner.style.display = 'block';
        
        updateStep('step1', true, false);
        
        if (!needsCreds) {
          fetch('/api/v1/superbuy/auth/interactive', { method: 'POST' })
            .then(function(resp) {
              if (!resp.ok) {
                return resp.json().then(function(data) {
                  if (data && data.needsCredentials) {
                    needsCreds = true;
                    if (spinner) spinner.style.display = 'none';
                    updateStep('step1', false, true);
                    updateStep('step2', false, false);
                    var steps = document.getElementById('steps');
                    if (steps) {
                      steps.insertAdjacentHTML('beforeend', '<div class="step active" id="step2b">Veuillez saisir vos identifiants Superbuy ci-dessous</div>');
                    }
                    var form = document.getElementById('credForm');
                    if (form) form.style.display = 'flex';
                    if (loginBtn) {
                      loginBtn.textContent = 'Se connecter (serveur)';
                      loginBtn.style.display = 'inline-block';
                    }
                    return;
                  }
                  throw new Error('Impossible de demarrer l authentification interactive');
                });
              }
              return handleAuthStarted();
            })
            .catch(function(e) {
              console.error('[Auth] Erreur demarrage:', e);
              alert('Erreur lors du demarrage de l authentification interactive.');
              location.reload();
            });
        } else {
          var usernameEl = document.getElementById('username');
          var passwordEl = document.getElementById('password');
          var username = usernameEl ? usernameEl.value.trim() : '';
          var password = passwordEl ? passwordEl.value.trim() : '';
          
          console.log('[Auth] Credentials saisis:', { username: username ? 'OK' : 'VIDE', password: password ? 'OK' : 'VIDE' });
          
          if (!username || !password) {
            alert('Veuillez saisir vos identifiants.');
            if (spinner) spinner.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'inline-block';
            return;
          }
          
          if (spinner) spinner.style.display = 'block';
          updateStep('step2', true, false);
          
          console.log('[Auth] Envoi requete headless avec credentials...');
          
          fetch('/api/v1/superbuy/auth/interactive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
          })
            .then(function(resp) {
              console.log('[Auth] Reponse recue, status:', resp.status);
              if (!resp.ok) {
                return resp.json().then(function(err) {
                  console.error('[Auth] Erreur serveur:', err);
                  throw new Error(err.error || 'Echec de l authentification serveur');
                });
              }
              return resp.json().then(function(data) {
                console.log('[Auth] Reponse OK:', data);
                return handleAuthStarted();
              });
            })
            .catch(function(e) {
              console.error('[Auth] Erreur:', e);
              alert('Erreur: ' + e.message);
              location.reload();
            });
        }
      }
      
      function handleAuthStarted() {
        updateStep('step1', false, true);
        updateStep('step2', true, false);
        checkInterval = setInterval(checkAuthStatus, 2000);
        setTimeout(function() {
          if (checkInterval) {
            clearInterval(checkInterval);
            alert('Delai d attente depasse. Veuillez reessayer.');
            location.reload();
          }
        }, 300000);
      }
      
      function checkAuthStatus() {
        fetch('/api/v1/superbuy/auth/verify')
          .then(function(response) { return response.json(); })
          .then(function(data) {
            console.log('[Auth] Verification:', data);
            if (data.authenticated) {
              clearInterval(checkInterval);
              checkInterval = null;
              updateStep('step2', false, true);
              updateStep('step3', false, true);
              updateStep('step4', true, false);
              console.log('[Auth] Authentification reussie');
              updateStep('step4', false, true);
              
              var spinner = document.getElementById('spinner');
              var success = document.getElementById('success');
              if (spinner) spinner.style.display = 'none';
              if (success) success.style.display = 'block';
              
              if (window.opener) {
                window.opener.postMessage({ type: 'superbuy_auth_success' }, '*');
              }
              setTimeout(function() { window.close(); }, 2000);
            }
          })
          .catch(function(error) {
            console.log('[Auth] Erreur verification (polling continue):', error);
          });
      }

      function startLoginWithCreds() {
        console.log('[Auth] Mode credentials active');
        needsCreds = true;
        
        var steps = document.getElementById('steps');
        var form = document.getElementById('credForm');
        var loginBtn = document.getElementById('loginBtn');
        var credsBtn = document.getElementById('credsBtn');
        var spinner = document.getElementById('spinner');
        
        if (steps) steps.style.display = 'block';
        updateStep('step1', false, true);
        if (form) {
          form.style.display = 'flex';
          console.log('[Auth] Formulaire affiche');
        }
        if (loginBtn) {
          loginBtn.textContent = 'Se connecter (serveur)';
          loginBtn.style.display = 'inline-block';
          console.log('[Auth] Bouton login transforme');
        }
        if (credsBtn) credsBtn.style.display = 'none';
        if (spinner) spinner.style.display = 'none';
      }
      
      document.addEventListener('DOMContentLoaded', function() {
        console.log('[Auth] DOM charge, attachement des event listeners...');
        var loginBtn = document.getElementById('loginBtn');
        var credsBtn = document.getElementById('credsBtn');
        
        if (loginBtn) {
          console.log('[Auth] Bouton login trouve');
          loginBtn.addEventListener('click', startLogin);
        } else {
          console.error('[Auth] Bouton login NON trouve !');
        }
        
        if (credsBtn) {
          console.log('[Auth] Bouton credentials trouve');
          credsBtn.addEventListener('click', startLoginWithCreds);
        } else {
          console.error('[Auth] Bouton credentials NON trouve !');
        }
      });
    })();
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
