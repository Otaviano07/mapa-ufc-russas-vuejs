import { ref, watch } from 'vue';

/**
 * Composable para gerenciar dados no localStorage de forma reativa.
 * @param {string} key - Chave para armazenar o valor no localStorage.
 * @param {any} defaultValue - Valor padrão se não existir item ou em caso de erro.
 * @returns {{ value: import('vue').Ref<any>, updateValue: (newValue: any) => boolean, removeItem: () => boolean }}
 */
export function useLocalStorage(key, defaultValue = null) {

  // Função interna para ler do localStorage com segurança
  const readStorage = () => {
    try {
      const item = window.localStorage.getItem(key);
      // Se item existe, parseia, senão retorna o padrão
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Erro ao ler "${key}" do localStorage:`, error);
      // Em caso de erro no parse ou leitura, retorna o valor padrão
      return defaultValue;
    }
  };

  // Cria referência reativa com o valor inicial lido do storage
  const storedValue = ref(readStorage());

  // Função para atualizar valor no localStorage e na ref
  const updateValue = (newValue) => {
    try {
      if (newValue === null || newValue === undefined) {
        // Remove o item se o novo valor for null ou undefined
        window.localStorage.removeItem(key);
      } else {
        // Salva o valor como string JSON
        window.localStorage.setItem(key, JSON.stringify(newValue));
      }
      // Atualiza a referência reativa
      storedValue.value = newValue;
      return true; // Indica sucesso
    } catch (error) {
      console.error(`Erro ao salvar "${key}" no localStorage:`, error);
      return false; // Indica falha
    }
  };

  // Observa a referência reativa e atualiza o localStorage quando ela muda
  watch(storedValue, (newValue) => {
    updateValue(newValue);
  }, { deep: true }); // Usa deep watch para objetos/arrays

  // Função para remover explicitamente o item do localStorage e resetar a ref
  const removeItem = () => {
    try {
      window.localStorage.removeItem(key);
      // Reseta a referência reativa para o valor padrão
      storedValue.value = defaultValue;
      return true; // Indica sucesso
    } catch (error) {
      console.error(`Erro ao remover "${key}" do localStorage:`, error);
      return false; // Indica falha
    }
  };

  // Listener para mudanças no storage vindas de outras abas/janelas
  // window.addEventListener('storage', (event) => {
  //   if (event.key === key) {
  //     storedValue.value = event.newValue ? JSON.parse(event.newValue) : defaultValue;
  //   }
  // });

  // Retorna a referência reativa e as funções de manipulação
  return {
    value: storedValue,
    updateValue,
    removeItem
  };
}