// script.js - Sistema Vanda - API Google Sheets
// Arquivo compartilhado por TODAS as páginas

class GoogleSheetsAPI {
    static obterConfiguracoesAtuais() {
        const padrao = {
            gas_url: '',
            spreadsheet_id: ''
        };
        const salvo = JSON.parse(localStorage.getItem('vanda_gas_config') || '{}');
        return { ...padrao, ...salvo };
    }

    static atualizarConfiguracoes(url, id) {
        const config = { gas_url: url, spreadsheet_id: id };
        localStorage.setItem('vanda_gas_config', JSON.stringify(config));
        return config;
    }

    static async testarConexao() {
        try {
            console.log('🔍 Iniciando teste de conexão...');
            const resposta = await this.get('testarConexao', {});
            console.log('✅ Resposta recebida:', resposta);
            return resposta && resposta.status === 'success';
        } catch (erro) {
            console.error('❌ Erro no teste:', erro);
            throw new Error('Falha na conexão: ' + erro.message);
        }
    }

    static async get(acao, parametros = {}) {
        return this.request(acao, parametros, 'GET');
    }

    static async request(acao, dados = {}, metodo = 'GET') {
        const config = this.obterConfiguracoesAtuais();
        
        if (!config.gas_url) {
            throw new Error('URL do GAS não configurada');
        }

        const url = new URL(config.gas_url);
        url.searchParams.set('action', acao);
        url.searchParams.set('spreadsheetId', config.spreadsheet_id);

        // Para GET, adiciona parâmetros na URL
        if (metodo === 'GET') {
            Object.keys(dados).forEach(key => {
                url.searchParams.set(key, JSON.stringify(dados[key]));
            });
        }

        console.log(`📤 ${metodo} ${acao}:`, url.toString());

        const opcoes = {
            method: metodo,
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'omit'
        };

        // Só adiciona headers e body para POST (quando necessário)
        if (metodo === 'POST' && Object.keys(dados).length > 0) {
            opcoes.headers = { 'Content-Type': 'application/json' };
            opcoes.body = JSON.stringify(dados);
        }

        try {
            const resposta = await fetch(url.toString(), opcoes);
            
            if (!resposta.ok) {
                throw new Error(`Erro HTTP ${resposta.status}: ${resposta.statusText}`);
            }
            
            const texto = await resposta.text();
            console.log('📨 Resposta bruta:', texto);
            
            let resultado;
            try {
                resultado = JSON.parse(texto);
            } catch (parseError) {
                throw new Error(`Resposta inválida do servidor: ${texto.substring(0, 100)}`);
            }

            if (resultado.status === 'error') {
                throw new Error(resultado.message || 'Erro no servidor');
            }

            console.log(`✅ ${acao} sucesso:`, resultado);
            return resultado;
        } catch (erro) {
            console.error(`❌ ${acao} falhou:`, erro);
            
            // Mensagem mais amigável para o usuário
            if (erro.message.includes('Failed to fetch') || erro.message.includes('NetworkError')) {
                throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão de internet.');
            } else if (erro.message.includes('CORS')) {
                throw new Error('Problema de segurança no servidor. Tente novamente.');
            } else {
                throw new Error(`Falha na requisição: ${erro.message}`);
            }
        }
    }
}

// Sistema de Notificações
class Notificacao {
    static mostrar(mensagem, tipo = 'info') {
        // Remove notificação existente
        const existente = document.getElementById('notificacao-sistema');
        if (existente) existente.remove();
        
        // Cria nova notificação
        const notif = document.createElement('div');
        notif.id = 'notificacao-sistema';
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-family: 'Segoe UI', system-ui, sans-serif;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        const cores = {
            success: '#28a745',
            error: '#dc3545', 
            warning: '#ffc107',
            info: '#17a2b8'
        };
        
        notif.style.backgroundColor = cores[tipo] || cores.info;
        notif.textContent = mensagem;
        document.body.appendChild(notif);
        
        // Remove após 4 segundos
        setTimeout(() => {
            if (notif.parentNode) notif.parentNode.removeChild(notif);
        }, 4000);
    }
}

// Carregar tema da empresa automaticamente em todas as páginas
document.addEventListener('DOMContentLoaded', function() {
    carregarTemaEmpresa();
});

function carregarTemaEmpresa() {
    try {
        const empresa = JSON.parse(localStorage.getItem('vanda_empresa') || '{}');
        if (empresa.corPrimaria) {
            document.documentElement.style.setProperty('--cor-primaria', empresa.corPrimaria);
        }
        if (empresa.corSecundaria) {
            document.documentElement.style.setProperty('--cor-secundaria', empresa.corSecundaria);
        }
        if (empresa.corPrimaria && empresa.corSecundaria) {
            document.documentElement.style.setProperty('--fundo-gradiente', 
                `linear-gradient(135deg, ${empresa.corPrimaria}, ${empresa.corSecundaria})`);
        }
        
        // Atualizar nome da empresa no título se existir
        const tituloEmpresa = document.getElementById('nomeEmpresa');
        if (tituloEmpresa && empresa.nome) {
            tituloEmpresa.textContent = empresa.nome;
        }
    } catch (error) {
        console.log('ℹ️ Tema da empresa não configurado');
    }
}
