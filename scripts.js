const searchBar = document.querySelector('input');
const cards = document.querySelectorAll('.card');

function getTitle(card) {
    for (const cardText of card.children) {
        if (cardText.className === 'card-text') {
            for (const header of cardText.children) {
                if (header.className === 'header') {
                    return header.textContent.toLowerCase().split(' ');
                }
            }
        }
    }
}

function getTags(card) {
    for (const cardText of card.children) {
        if (cardText.className === 'card-text') {
            for (const tags of cardText.children) {
                if (tags.className === 'tags') {
                    const tagList = [];
                    for (let i = 0; i < tags.children.length; i++) {
                        tagList.push(tags.children[i].textContent.toLowerCase());
                    }
                    return tagList;
                }
            }
        }
    }
}

const validTags = [
    'tag:platformer',
    'tag:infinite',
    'tag:puzzle',
    'tag:2d',
    'tag:3d'
];

for (let i = 0; i < cards.length; i++) {
    for (const cardText of cards[i].children) {
        if (cardText.className === 'card-text') {
            for (const tags of cardText.children) {
                if (tags.className === 'tags') {
                    for (const tag of tags.children) {
                        tag.onclick = () => {
                            const tagString = `tag:${tag.innerHTML.toLowerCase()}`;
                            if (searchBar.value.length >= tagString.length
                                && searchBar.value.includes(tagString)) {
                                return;
                            }
                            if (searchBar.value.replace(' ', '').length === 0) {
                                searchBar.value = tagString;
                                searchBar.oninput();
                                return;
                            }
                            searchBar.value = `${tagString} ${searchBar.value}`;
                            
                            searchBar.oninput();
                        }
                    }
                }
            }
        }
    }
}

searchBar.oninput = () => {
    const tokens = searchBar.value.toLowerCase().split(' ');
    
    for (const card of cards) {
        card.style.display = 'inline-block';
    }
    
    for (const card of cards) {
        const title = getTitle(card);
        for (let i = 0; i < tokens.length; i++) {
            if(tokens[i].startsWith('tag:')) {
                const cardTags = getTags(card);
                let matched = !validTags.includes(tokens[i]);
                for (let j = 0; j < cardTags.length; j++) {
                    if (tokens[i] === `tag:${cardTags[j]}`) {
                        matched = true;
                    }
                }
                if (!matched) {
                    card.style.display = 'none';
                }
            } else {
                let containsWord = false;
                for (let j = 0; j < title.length; j++) {
                    if (title[j] === tokens[i]) {
                        containsWord = true;
                        title.splice(j, 1);
                        j--;
                    }
                }
                for (let j = 0; j < title.length; j++) {
                    if (title[j].includes(tokens[i])) {
                        containsWord = true;
                        title.splice(j, 1);
                        j--;
                    }
                }
                if (!containsWord) {
                    card.style.display = 'none';
                }
            }
        }
    }
    
    let oneShown = false;
    
    for (const card of cards) {
        if (card.style.display !== 'none') {
            oneShown = true;
            break;
        }
    }
    
    const nrText = document.querySelector('.no-results');
    
    if (!oneShown) {
        nrText.style.display = 'inline-block';
    } else {
        nrText.style.display = 'none';
    }
}