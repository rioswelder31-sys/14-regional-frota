// Script para Inicializar Estruturas de Segurança no Firebase
// Execute este código NO CONSOLE DO FIREBASE (dentro do projeto)
// Ele criará as estruturas de controle de acesso

/* 
   INSTRUÇÃO DE USO:
   
   1. Acesse: https://console.firebase.google.com/project/frota14regional-8fecc/database
   2. Abra o Console do Navegador: F12 → Aba "Console"
   3. Cole este código completo
   4. Pressione ENTER
   
   AVISO: Este script REQUER que você seja admin do Firebase!
*/

// Configuração do Realtime Database
const db = firebase.database().ref();

// IDs de exemplo - SUBSTITUA PELOS REAIS
const ADMIN_IDS = {
  WELDER_RIOS: 'seu_uid_aqui',           // Admin System
  ESTHER_BOBBIO: 'uid_esther_aqui',      // Admin EUNAPOLIS
  SILVANA_CARDOSO: 'uid_silvana_aqui'    // Admin PORTO SEGURO
};

const USER_IDS = {
  // Adicione os UIDs de todos os usuários aqui
  // Obtém em: Firebase Console → Authentication
};

console.log('🔐 Iniciando setup de segurança do Firebase...');

// ========================================
// 1. CRIAR TABELA DE ADMINS DA 14ª REGIONAL
// ========================================
function criarAdmins14Regional() {
  return db.child('14-regional-admins').set({
    [ADMIN_IDS.WELDER_RIOS]: true,
    [ADMIN_IDS.ESTHER_BOBBIO]: true,
    [ADMIN_IDS.SILVANA_CARDOSO]: true
  }).then(() => {
    console.log('✅ Tabela 14-regional-admins criada com sucesso');
  }).catch(err => {
    console.error('❌ Erro ao criar 14-regional-admins:', err);
  });
}

// ========================================
// 2. CRIAR TABELA DE USUÁRIOS DA 14ª REGIONAL
// ========================================
function criarUsuarios14Regional() {
  const users14 = {};
  Object.values(ADMIN_IDS).forEach(uid => {
    users14[uid] = true;
  });
  Object.values(USER_IDS).forEach(uid => {
    users14[uid] = true;
  });

  return db.child('14-regional-users').set(users14).then(() => {
    console.log(`✅ Tabela 14-regional-users criada com ${Object.keys(users14).length} usuários`);
  }).catch(err => {
    console.error('❌ Erro ao criar 14-regional-users:', err);
  });
}

// ========================================
// 3. CRIAR TABELA GLOBAL DE ADMINS (MULTI-REGIONAL)
// ========================================
function criarAdminsGlobal() {
  return db.child('admins').set({
    [ADMIN_IDS.ESTHER_BOBBIO]: {
      regional: 'EUNAPOLIS',
      nome: 'Esther Bobbio'
    },
    [ADMIN_IDS.SILVANA_CARDOSO]: {
      regional: 'PORTO SEGURO',
      nome: 'Silvana Cardoso'
    }
  }).then(() => {
    console.log('✅ Tabela admins criada com sucesso');
  }).catch(err => {
    console.error('❌ Erro ao criar admins:', err);
  });
}

// ========================================
// 4. CRIAR TABELA GLOBAL DE USUÁRIOS (MULTI-REGIONAL)
// ========================================
function criarUsuariosGlobal() {
  const usersGlobal = {
    [ADMIN_IDS.ESTHER_BOBBIO]: {
      regional: 'EUNAPOLIS',
      nome: 'Esther Bobbio',
      tipo: 'admin'
    },
    [ADMIN_IDS.SILVANA_CARDOSO]: {
      regional: 'PORTO SEGURO',
      nome: 'Silvana Cardoso',
      tipo: 'admin'
    }
  };

  // Adicione os demais usuários conforme necessário
  // Exemplo:
  // [UID_USUARIO_1]: {
  //   regional: 'PUERTO_SEGURO',
  //   nome: 'João Silva',
  //   tipo: 'user'
  // }

  return db.child('users').set(usersGlobal).then(() => {
    console.log('✅ Tabela users criada com sucesso');
  }).catch(err => {
    console.error('❌ Erro ao criar users:', err);
  });
}

// ========================================
// 5. CRIAR TABELA DE SYSTEM ADMINS
// ========================================
function criarSystemAdmins() {
  return db.child('system-admins').set({
    [ADMIN_IDS.WELDER_RIOS]: true
  }).then(() => {
    console.log('✅ Tabela system-admins criada com sucesso');
  }).catch(err => {
    console.error('❌ Erro ao criar system-admins:', err);
  });
}

// ========================================
// EXECUTAR TODOS
// ========================================
async function executarSetupCompleto() {
  try {
    console.log('\n📋 Iniciando setup de segurança...\n');
    
    await criarAdmins14Regional();
    await criarUsuarios14Regional();
    await criarAdminsGlobal();
    await criarUsuariosGlobal();
    await criarSystemAdmins();
    
    console.log('\n✅ ✅ ✅ SETUP COMPLETO COM SUCESSO! ✅ ✅ ✅');
    console.log('\n📊 Resumo:');
    console.log('  • 14-regional-admins: Criada');
    console.log('  • 14-regional-users: Criada');
    console.log('  • admins: Criada');
    console.log('  • users: Criada');
    console.log('  • system-admins: Criada');
    console.log('\n✅ Agora acesse Rules e publique as regras de segurança');
    
  } catch (err) {
    console.error('\n❌ Erro durante setup:', err);
  }
}

// Execute
executarSetupCompleto();

// ========================================
// FUNÇÃO AUXILIAR: Adicionar novo admin
// ========================================
function adicionarAdmin(uid, regional, nome) {
  Promise.all([
    db.child('admins').child(uid).set({ regional, nome }),
    db.child('users').child(uid).set({ regional, nome, tipo: 'admin' })
  ]).then(() => {
    console.log(`✅ Admin ${nome} adicionado à regional ${regional}`);
  }).catch(err => console.error('❌ Erro:', err));
}

// ========================================
// FUNÇÃO AUXILIAR: Adicionar novo usuário
// ========================================
function adicionarUsuario(uid, regional, nome) {
  const path = regional === '14-regional' 
    ? db.child('14-regional-users').child(uid)
    : db.child('users').child(uid);
  
  path.set(regional === '14-regional' ? true : { regional, nome, tipo: 'user' });
  console.log(`✅ Usuário ${nome} adicionado à regional ${regional}`);
}

// ========================================
// FUNÇÃO AUXILIAR: Remover usuário
// ========================================
function removerUsuario(uid, regional) {
  const path = regional === '14-regional' 
    ? db.child('14-regional-users').child(uid)
    : db.child('users').child(uid);
  
  path.remove().then(() => {
    console.log(`✅ Usuário removido da regional ${regional}`);
  }).catch(err => console.error('❌ Erro:', err));
}

console.log('\n📝 Funções auxiliares disponíveis:');
console.log('  • adicionarAdmin(uid, regional, nome)');
console.log('  • adicionarUsuario(uid, regional, nome)');
console.log('  • removerUsuario(uid, regional)');
console.log('\nExemplos:');
console.log('  adicionarAdmin("abc123", "EUNAPOLIS", "Novo Admin")');
console.log('  adicionarUsuario("xyz789", "PORTO_SEGURO", "João Silva")');
console.log('  removerUsuario("abc123", "EUNAPOLIS")');
