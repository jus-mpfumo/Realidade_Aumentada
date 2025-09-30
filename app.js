/* app.js - Gestão de login, signup, feedback (localStorage) */

const LS_USERS_KEY = 'ra_app_users_v1';
const LS_CURRENT_KEY = 'ra_app_current_v1';
const LS_FEEDBACK_KEY = 'ra_app_feedback_v1';

function $(id){ return document.getElementById(id); }
function show(id){
  document.querySelectorAll('section').forEach(s=>s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

/* --- utilitário: hash simples para senha (SHA-256) */
async function hashPassword(pass){
  const enc = new TextEncoder().encode(pass);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* --- CRUD localStorage --- */
function loadUsers(){ return JSON.parse(localStorage.getItem(LS_USERS_KEY) || '[]'); }
function saveUsers(list){ localStorage.setItem(LS_USERS_KEY, JSON.stringify(list)); }

async function createUser({name,email,password}){
  const users = loadUsers();
  if(users.find(u=>u.email===email)) throw new Error('Email já cadastrado');
  const pwdHash = await hashPassword(password);
  users.push({name,email,password:pwdHash,role:'tutor'});
  saveUsers(users);
}

async function loginUser(email,password){
  const users = loadUsers();
  const u = users.find(x=>x.email===email);
  if(!u) throw new Error('Usuário não encontrado');
  const pwdHash = await hashPassword(password);
  if(u.password !== pwdHash) throw new Error('Senha incorreta');
  localStorage.setItem(LS_CURRENT_KEY, email);
  return u;
}

function logoutUser(){ localStorage.removeItem(LS_CURRENT_KEY); }
function getCurrentUser(){
  const email = localStorage.getItem(LS_CURRENT_KEY);
  if(!email) return null;
  return loadUsers().find(u=>u.email===email) || null;
}

/* --- feedback --- */
function saveFeedback(userEmail, rating, comment){
  const list = JSON.parse(localStorage.getItem(LS_FEEDBACK_KEY) || '[]');
  list.push({user:userEmail, rating, comment, date:new Date().toISOString()});
  localStorage.setItem(LS_FEEDBACK_KEY, JSON.stringify(list));
}

/* --- eventos DOM --- */
document.addEventListener('DOMContentLoaded', ()=>{
  // refs
  const fLogin = $('form-login'), fSignup=$('form-signup'), fFeedback=$('form-feedback');

  // botoes navegação
  $('btn-show-signup').onclick = ()=> show('view-signup');
  $('btn-back-login').onclick = ()=> show('view-login');
  $('btn-back-welcome').onclick = ()=> show('view-welcome');

  // signup
  fSignup?.addEventListener('submit', async ev=>{
    ev.preventDefault();
    try{
      await createUser({
        name:$('signup-name').value.trim(),
        email:$('signup-email').value.trim(),
        password:$('signup-pass').value
      });
      alert('Conta criada! Faça login.');
      show('view-login');
    }catch(e){ alert(e.message); }
  });

  // login
  fLogin?.addEventListener('submit', async ev=>{
    ev.preventDefault();
    try{
      const u = await loginUser($('login-email').value.trim(), $('login-pass').value);
      $('welcome-name').textContent = u.name;
      show('view-welcome');
    }catch(e){ alert(e.message); }
  });

  // logout
  $('btn-logout').onclick = ()=>{ logoutUser(); show('view-login'); };

  // abrir RA 
  $('btn-go-ar').onclick = ()=>{ window.location.href='ar.html'; };

  // feedback
  $('btn-open-feedback').onclick = ()=> show('view-feedback');
  fFeedback?.addEventListener('submit', ev=>{
    ev.preventDefault();
    const u = getCurrentUser();
    saveFeedback(u?.email||'anon', $('feedback-rating').value, $('feedback-comment').value);
    alert('Obrigado pelo feedback!');
    $('feedback-comment').value='';
    show('view-welcome');
  });

  /* --- update e delete --- */
function updateUser(email, newData){
  const users = loadUsers();
  const idx = users.findIndex(u=>u.email===email);
  if(idx === -1) return false;
  users[idx] = {...users[idx], ...newData};
  saveUsers(users);
  return true;
}

function deleteUser(email){
  let users = loadUsers();
  users = users.filter(u=>u.email!==email);
  saveUsers(users);
}


  // estado inicial
  const cur = getCurrentUser();
  if(cur){
    $('welcome-name').textContent = cur.name;
    show('view-welcome');
  } else {
    show('view-login');
  }
  // abrir gestão de utilizadores
$('btn-manage-users').onclick = ()=>{
  renderUsersTable();
  show('view-users');
};
$('btn-back-welcome2').onclick = ()=> show('view-welcome');

// render tabela
// render tabela
function renderUsersTable(){
  const tbody = $('users-table');
  tbody.innerHTML = '';
  loadUsers().forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
    <td contenteditable="true" data-field="name">${u.name}</td>
    <td contenteditable="true" data-field="name">${u.email}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>
        <button class="btn-edit" data-email="${u.email}">Editar</button>
        <button class="btn-delete" data-email="${u.email}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // botão editar → abre modal
  tbody.querySelectorAll('.btn-edit').forEach(btn=>{
    btn.onclick = ()=>{
      const email = btn.dataset.email;
      const user = loadUsers().find(u=>u.email===email);
      $('edit-email').value = email;
      $('edit-name').value = user.name;
      $('edit-pass').value = '';
      $('edit-modal').classList.remove('hidden');
    };
  });

  // botão delete
  tbody.querySelectorAll('.btn-delete').forEach(btn=>{
    btn.onclick = ()=>{
      const email = btn.dataset.email;
      if(confirm('Apagar utilizador?')){
        deleteUser(email);
        renderUsersTable();
      }
    };
  });
}

// modal cancelar
$('btn-cancel-edit').onclick = ()=> $('edit-modal').classList.add('hidden');

// salvar edição
$('form-edit-user').addEventListener('submit', async ev=>{
  ev.preventDefault();
  const email = $('edit-email').value;
  const name = $('edit-name').value.trim();
  const newPass = $('edit-pass').value;

  const data = {name};
  if(newPass){
    data.password = await hashPassword(newPass);
  }

  updateUser(email, data);
  alert('Utilizador atualizado!');
  $('edit-modal').classList.add('hidden');
  renderUsersTable();
});


});
