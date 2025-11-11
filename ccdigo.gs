// Código Google Apps Script para Sistema Vanda - VERSÃO CORRIGIDA
// Compatível com todas as funcionalidades do frontend

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const action = e.parameter.action;
    const spreadsheetId = e.parameter.spreadsheetId;
    
    if (!spreadsheetId) {
      return createResponse('error', 'ID da planilha não fornecido', null);
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    
    // Log para debug
    console.log('Ação:', action, 'Planilha:', spreadsheetId);
    
    switch(action) {
      case 'testarConexao':
        return testarConexao(ss);
      case 'obterProdutos':
        return obterProdutos(ss);
      case 'obterVendas':
        return obterVendas(ss);
      case 'obterEmpresa':
        return obterEmpresa(ss);
      case 'salvarProduto':
        return salvarProduto(ss, e.postData ? JSON.parse(e.postData.contents) : {});
      case 'salvarVenda':
        return salvarVenda(ss, e.postData ? JSON.parse(e.postData.contents) : {});
      case 'salvarEmpresa':
        return salvarEmpresa(ss, e.postData ? JSON.parse(e.postData.contents) : {});
      default:
        return createResponse('error', 'Ação não reconhecida: ' + action, null);
    }
  } catch (error) {
    console.error('Erro geral:', error);
    return createResponse('error', 'Erro interno: ' + error.message, null);
  }
}

function testarConexao(ss) {
  try {
    // Tenta acessar a planilha
    const sheets = ss.getSheets();
    return createResponse('success', 'Conexão bem-sucedida', {
      totalAbas: sheets.length,
      nomesAbas: sheets.map(sheet => sheet.getName())
    });
  } catch (error) {
    throw new Error('Falha ao conectar com a planilha: ' + error.message);
  }
}

function obterProdutos(ss) {
  try {
    let sheet = ss.getSheetByName('Produtos');
    if (!sheet) {
      return createResponse('success', 'Aba Produtos não encontrada - criando vazia', { produtos: [] });
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createResponse('success', 'Nenhum produto cadastrado', { produtos: [] });
    }
    
    const headers = data[0];
    const produtos = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // Tem ID
        const produto = {
          ID: row[headers.indexOf('ID')] || `P${i}`,
          Nome: row[headers.indexOf('Nome')] || '',
          Preco: parseFloat(row[headers.indexOf('Preco')]) || 0,
          Categoria: row[headers.indexOf('Categoria')] || 'Outros',
          Estoque: parseInt(row[headers.indexOf('Estoque')]) || 0,
          Codigo: row[headers.indexOf('Codigo')] || ''
        };
        produtos.push(produto);
      }
    }
    
    return createResponse('success', 'Produtos carregados', { produtos });
  } catch (error) {
    throw new Error('Erro ao carregar produtos: ' + error.message);
  }
}

function obterVendas(ss) {
  try {
    let sheet = ss.getSheetByName('Vendas');
    if (!sheet) {
      return createResponse('success', 'Aba Vendas não encontrada - criando vazia', { vendas: [] });
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createResponse('success', 'Nenhuma venda registrada', { vendas: [] });
    }
    
    const headers = data[0];
    const vendas = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // Tem ID
        const venda = {
          ID: row[headers.indexOf('ID')] || `V${i}`,
          Cliente: row[headers.indexOf('Cliente')] || '',
          Data: row[headers.indexOf('Data')] || new Date().toISOString(),
          Total: parseFloat(row[headers.indexOf('Total')]) || 0,
          Status: row[headers.indexOf('Status')] || 'Concluída',
          FormaPagamento: row[headers.indexOf('FormaPagamento')] || 'Dinheiro',
          Produtos: tryParseJSON(row[headers.indexOf('Produtos')]) || []
        };
        vendas.push(venda);
      }
    }
    
    return createResponse('success', 'Vendas carregadas', { vendas });
  } catch (error) {
    throw new Error('Erro ao carregar vendas: ' + error.message);
  }
}

function obterEmpresa(ss) {
  try {
    let sheet = ss.getSheetByName('Empresa');
    if (!sheet) {
      return createResponse('success', 'Aba Empresa não encontrada', { empresa: {} });
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createResponse('success', 'Nenhuma configuração salva', { empresa: {} });
    }
    
    const headers = data[0];
    const empresa = {};
    
    // Pega a primeira linha de dados (linha 2)
    if (data.length > 1) {
      const row = data[1];
      empresa.nome = row[headers.indexOf('Nome')] || '';
      empresa.endereco = row[headers.indexOf('Endereco')] || '';
      empresa.telefone = row[headers.indexOf('Telefone')] || '';
      empresa.email = row[headers.indexOf('Email')] || '';
      empresa.corPrimaria = row[headers.indexOf('CorPrimaria')] || '#667eea';
      empresa.corSecundaria = row[headers.indexOf('CorSecundaria')] || '#764ba2';
    }
    
    return createResponse('success', 'Dados da empresa carregados', { empresa });
  } catch (error) {
    throw new Error('Erro ao carregar dados da empresa: ' + error.message);
  }
}

function salvarProduto(ss, dados) {
  try {
    let sheet = ss.getSheetByName('Produtos');
    if (!sheet) {
      sheet = ss.insertSheet('Produtos');
      sheet.getRange(1, 1, 1, 6).setValues([['ID', 'Nome', 'Preco', 'Categoria', 'Estoque', 'Codigo']]);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    let produtoId = dados.ID;
    let linhaIndex = -1;
    
    // Procura produto existente
    if (produtoId) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === produtoId) {
          linhaIndex = i;
          break;
        }
      }
    }
    
    const novoProduto = [
      produtoId || `P${Date.now()}`,
      dados.Nome || '',
      parseFloat(dados.Preco) || 0,
      dados.Categoria || 'Outros',
      parseInt(dados.Estoque) || 0,
      dados.Codigo || ''
    ];
    
    if (linhaIndex > 0) {
      // Atualiza produto existente
      sheet.getRange(linhaIndex + 1, 1, 1, 6).setValues([novoProduto]);
    } else {
      // Adiciona novo produto
      sheet.appendRow(novoProduto);
      produtoId = novoProduto[0];
    }
    
    return createResponse('success', 'Produto salvo com sucesso', { 
      produtoId: produtoId,
      produto: {
        ID: produtoId,
        Nome: dados.Nome,
        Preco: parseFloat(dados.Preco) || 0,
        Categoria: dados.Categoria,
        Estoque: parseInt(dados.Estoque) || 0,
        Codigo: dados.Codigo
      }
    });
  } catch (error) {
    throw new Error('Erro ao salvar produto: ' + error.message);
  }
}

function salvarVenda(ss, dados) {
  try {
    let sheet = ss.getSheetByName('Vendas');
    if (!sheet) {
      sheet = ss.insertSheet('Vendas');
      sheet.getRange(1, 1, 1, 7).setValues([['ID', 'Cliente', 'Data', 'Total', 'Status', 'FormaPagamento', 'Produtos']]);
    }
    
    const vendaId = `V${Date.now()}`;
    const novaVenda = [
      vendaId,
      dados.Cliente || '',
      new Date().toISOString(),
      parseFloat(dados.Total) || 0,
      dados.Status || 'Concluída',
      dados.FormaPagamento || 'Dinheiro',
      JSON.stringify(dados.Produtos || [])
    ];
    
    sheet.appendRow(novaVenda);
    
    // Atualiza estoque dos produtos vendidos
    if (dados.Produtos && Array.isArray(dados.Produtos)) {
      atualizarEstoque(ss, dados.Produtos);
    }
    
    return createResponse('success', 'Venda registrada com sucesso', { 
      vendaId: vendaId,
      venda: {
        ID: vendaId,
        Cliente: dados.Cliente,
        Total: parseFloat(dados.Total) || 0,
        Status: dados.Status || 'Concluída',
        FormaPagamento: dados.FormaPagamento || 'Dinheiro',
        Produtos: dados.Produtos || []
      }
    });
  } catch (error) {
    throw new Error('Erro ao salvar venda: ' + error.message);
  }
}

function salvarEmpresa(ss, dados) {
  try {
    let sheet = ss.getSheetByName('Empresa');
    if (!sheet) {
      sheet = ss.insertSheet('Empresa');
      sheet.getRange(1, 1, 1, 6).setValues([['Nome', 'Endereco', 'Telefone', 'Email', 'CorPrimaria', 'CorSecundaria']]);
    }
    
    // Limpa dados existentes (mantém cabeçalho)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 6).clearContent();
    }
    
    const novaEmpresa = [
      dados.nome || '',
      dados.endereco || '',
      dados.telefone || '',
      dados.email || '',
      dados.corPrimaria || '#667eea',
      dados.corSecundaria || '#764ba2'
    ];
    
    sheet.getRange(2, 1, 1, 6).setValues([novaEmpresa]);
    
    return createResponse('success', 'Dados da empresa salvos com sucesso', { 
      empresa: {
        nome: dados.nome,
        endereco: dados.endereco,
        telefone: dados.telefone,
        email: dados.email,
        corPrimaria: dados.corPrimaria,
        corSecundaria: dados.corSecundaria
      }
    });
  } catch (error) {
    throw new Error('Erro ao salvar dados da empresa: ' + error.message);
  }
}

function atualizarEstoque(ss, produtos) {
  try {
    const sheet = ss.getSheetByName('Produtos');
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (const produtoVenda of produtos) {
      for (let i = 1; i < data.length; i++) {
        const produtoId = data[i][headers.indexOf('ID')];
        if (produtoId === produtoVenda.ID) {
          const estoqueAtual = parseInt(data[i][headers.indexOf('Estoque')]) || 0;
          const novoEstoque = estoqueAtual - (parseInt(produtoVenda.quantidade) || 0);
          sheet.getRange(i + 1, headers.indexOf('Estoque') + 1).setValue(Math.max(0, novoEstoque));
          break;
        }
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
  }
}

function tryParseJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return [];
  }
}

function createResponse(status, message, data) {
  const response = {
    status: status,
    message: message,
    data: data
  };
  
  // CORREÇÃO: Removido setHeaders() que não existe
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
