import { esc } from './ui.js';

export function optionsEditor(form, initial = []) {
  let root = form.querySelector('[data-options-editor]');
  if (!root) {
    root = document.createElement('section');
    root.dataset.optionsEditor = '';
    form.querySelector('button[type="submit"], .btn-primary').parentElement.before(root);
  }
  root.innerHTML = '<h3>Personalização do produto</h3><p>Crie grupos como tamanho, bebida ou adicionais. Use nomes diferentes para cada opção.</p><div data-groups></div><button type="button" class="btn btn-outline" data-add-group>+ Grupo de opções</button>';
  const addChoice = (group, choice = {}) => {
    const row = document.createElement('div');
    row.className = 'option-editor-choice';
    row.innerHTML = `<input class="input" data-choice-name placeholder="Ex.: Queijo extra" aria-label="Nome da opção" value="${esc(choice.name || '')}" required><input class="input" data-choice-price type="number" min="0" step="0.01" aria-label="Preço adicional" value="${choice.price || 0}" required><button type="button" aria-label="Remover opção">×</button>`;
    row.querySelector('button').onclick = () => row.remove();
    group.querySelector('[data-choices]').append(row);
  };
  const addGroup = (value = {}) => {
    const group = document.createElement('fieldset');
    group.dataset.optionGroup = '';
    group.innerHTML = `<legend>Grupo de opções</legend><input class="input" data-group-name placeholder="Ex.: Escolha o tamanho" aria-label="Nome do grupo" value="${esc(value.name || '')}" required><label>Seleção<select class="input" data-group-type><option value="single">Uma opção</option><option value="multiple">Várias opções</option></select></label><label><input type="checkbox" data-group-required ${value.required ? 'checked' : ''}> Escolha obrigatória</label><div data-choices></div><button class="btn btn-outline" type="button" data-add-choice>+ Opção</button><button class="btn btn-ghost" type="button" data-remove-group>Remover grupo</button>`;
    group.querySelector('[data-group-type]').value = value.type || 'single';
    group.querySelector('[data-add-choice]').onclick = () => addChoice(group);
    group.querySelector('[data-remove-group]').onclick = () => group.remove();
    (value.choices?.length ? value.choices : [{}]).forEach(choice => addChoice(group, choice));
    root.querySelector('[data-groups]').append(group);
  };
  root.querySelector('[data-add-group]').onclick = () => addGroup();
  initial.forEach(addGroup);
}

export function readOptions(form) {
  return [...form.querySelectorAll('[data-option-group]')].map(group => ({
    name: group.querySelector('[data-group-name]').value.trim(),
    type: group.querySelector('[data-group-type]').value,
    required: group.querySelector('[data-group-required]').checked,
    choices: [...group.querySelectorAll('.option-editor-choice')].map(row => ({ name: row.querySelector('[data-choice-name]').value.trim(), price: Number(row.querySelector('[data-choice-price]').value) })),
  }));
}
