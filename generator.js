document
  .querySelectorAll('[data-bs-toggle="tooltip"]')
  .forEach(el => new bootstrap.Tooltip(el));

let SPELL_LIST = {};

const SCHOOLS = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  V: 'Evocation',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation'
};

function displayAlert(event) {
  document.getElementById('alert-placeholder').insertAdjacentHTML(
    'beforeend',
    `
<div class="alert alert-danger d-inline-flex" role="alert">
  <i class="bi bi-exclamation-triangle-fill"></i>
  <div class="ms-2">${event}</div>
</div>
  `
  );
}

function clearAlerts() {
  document.getElementById('alert-placeholder').replaceChildren();
}

window.onerror = event => displayAlert(event);

/**
 * Calculates the number of spells available at each spell level based on class level and income.
 *
 * @param {number} classLevel - The level of the character's class.
 * @param {number} income - The income level of the character (additional spells per spell level).
 * @returns {number[]} An array representing the number of spells available at each spell level.
 */
function getSpellCount(classLevel, income) {
  const maxSpellLevel = Math.min(Math.ceil(classLevel / 2), 9);
  const spellCount = new Array(maxSpellLevel).fill(4 + income);
  spellCount[0] += 4;
  if (classLevel % 2 !== 0) spellCount[maxSpellLevel - 1] -= 2;
  if (classLevel >= 19) spellCount[8] += 4;
  return spellCount;
}

/**
 * Generates a spellbook based on class level, wealth level, school of magic and selected source books.
 * @returns {void}
 */
function spellbook() {
  const spellbook = document.getElementById('spellbook');
  spellbook.replaceChildren();
  const level = parseInt(document.getElementById('level').value, 10);
  const desiredSchool = document.getElementById('school').value;
  const income = parseInt(document.getElementById('wealth').value, 10);

  if (Number.isNaN(level) || level < 1 || level > 20) {
    displayAlert('Invalid level. Please enter a number between 1 and 20.');
    return;
  }

  const list = document.createElement('ul');
  list.classList.add('list-group', 'list-group-flush');

  const spellsByLevel = Object.groupBy(
    getSelectedSourceBooks().flatMap(id => SPELL_LIST[id]),
    ({ level }) => level
  );

  for (const [i, count] of getSpellCount(level, income).entries()) {
    const spellLevel = i + 1;
    let spells = spellsByLevel[spellLevel] ?? [];

    // Shuffle randomly
    for (let i = spells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spells[i], spells[j]] = [spells[j], spells[i]];
    }

    if (desiredSchool)
      for (let i = 0, j = 0; i < spells.length && j < 2; i++)
        if (spells[i].school === desiredSchool)
          [spells[j++], spells[i]] = [spells[i], spells[j]];

    spells = spells.slice(0, count);

    const listItem = document.createElement('li');
    listItem.classList.add('list-group-item');
    listItem.innerHTML = `<h3>Level ${spellLevel}</h3>`;
    const ulElement = document.createElement('ul');

    if (spells.length === 0) {
      listItem.classList.add('disabled');
    } else {
      spells.forEach(({ name, school }) =>
        ulElement.insertAdjacentHTML(
          'beforeend',
          `<li><span class="fw-medium">${name}</span> <span class="fw-light">(${SCHOOLS[school]})</span></li>`
        )
      );
      listItem.append(ulElement);
    }
    list.append(listItem);
  }

  const heading2 = document.createElement('h2');
  heading2.classList.add('border-top');
  heading2.classList.add('pt-3');
  heading2.textContent = 'Spellbook';

  spellbook.append(heading2, list);
  clearAlerts();
}

function getSelectedSourceBooks() {
  const selectedSources = [];
  document
    .getElementById('sourcebook-options')
    .querySelectorAll('.form-check-input')
    .forEach(checkbox => {
      if (checkbox.checked) selectedSources.push(checkbox.value);
    });

  return selectedSources;
}

function fillSourceBooks(sources) {
  const dropdownOptions = document.getElementById('sourcebook-options');

  for (const key of sources) {
    const listItem = document.createElement('li');
    listItem.innerHTML = `
<div class="form-check">
  <input class="form-check-input" type="checkbox" id="checkbox-${key}" value="${key}">
  <label class="form-check-label" for="checkbox-${key}">${key}</label>
</div>
    `;
    dropdownOptions.append(listItem);
  }
  document.getElementById('checkbox-PHB').checked = true;
}

const GITHUB_5ETOOLS =
  'https://raw.githubusercontent.com/5etools-mirror-1/5etools-mirror-1.github.io/master/data/spells/';
const fetchJSON = url => fetch(url).then(resp => resp.json());

Promise.all([
  fetchJSON(GITHUB_5ETOOLS + 'index.json'),
  fetchJSON(GITHUB_5ETOOLS + 'sources.json')
])
  .then(async ([index, sources]) => {
    SPELL_LIST = Object.fromEntries(
      (
        await Promise.all(
          Object.entries(sources).map(async ([id, source]) => [
            id,
            (await fetchJSON(GITHUB_5ETOOLS + index[id])).spell
              .filter(
                ({ name, level }) =>
                  level > 0 &&
                  (
                    source[name].classVariant?.some(cls => cls.name === 'Wizard') ||
                    source[name].class?.some(cls => cls.name === 'Wizard')
                  )
              )
              .map(({ name, level, school }) => ({ name, level, school }))
          ])
        )
      ).filter(([id, spells]) => spells.length > 0)
    );

    const onDOMLoaded = () => fillSourceBooks(Object.keys(SPELL_LIST));
    if (document.readyState !== 'loading') onDOMLoaded();
    else document.addEventListener('DOMContentLoaded', onDOMLoaded);
  })
  .catch(reason => displayAlert(reason));
